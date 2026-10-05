"""Piloto B2B manual: abra no VS Code e use Run Python File.

Uma tentativa por área. Não executado pelo agente. Não inicia serviços.
O prazo HTTP não garante cancelamento da consulta no servidor.
"""
from datetime import datetime, timezone
import json
import multiprocessing as mp
from pathlib import Path
import sys
from urllib.parse import urlencode, urlsplit

from measure_map_contracts import measure

CONFIG = {
    "base_url": "http://127.0.0.1:8801",
    "filters": {"uf": "MG", "municipio": "4123", "segmentos": "restaurantes", "catalog_version": "b2b-v1", "atividade_escopo": "principal"},
    "limit": 10,
    "timeout_seconds": 20,
}


def plan():
    origin = urlsplit(CONFIG["base_url"])
    if origin.scheme not in {"http", "https"} or not origin.hostname or origin.username or origin.password or origin.path not in {"", "/"} or origin.query or origin.fragment:
        raise ValueError("Configure uma origem HTTP(S) sem credenciais, caminho ou query.")
    filters = CONFIG["filters"]
    if not filters.get("uf") or not filters.get("municipio") or not (filters.get("segmentos") or filters.get("cnaes")):
        raise ValueError("Este piloto exige território municipal e atividade explícita.")
    if not 1 <= CONFIG["limit"] <= 100 or not 1 <= CONFIG["timeout_seconds"] <= 20:
        raise ValueError("Limite 1–100; prazo 1–20 segundos.")
    return [{"area": area, "filters": filters, "url": CONFIG["base_url"].rstrip("/") + "/api/v1/receita-federal/cnpj/" + route + "/mapa/?" + urlencode({**filters, "limit": CONFIG["limit"]})} for area, route in (("Empresas", "estabelecimentos"), ("Sócios", "socios"))]


def main():
    cases = plan()
    if "--dry-run" in sys.argv:
        print(json.dumps(cases, ensure_ascii=False, indent=2))
        return
    folder = Path(__file__).resolve().parents[1] / "var/map-contract-measurements" / (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ") + "_b2b")
    folder.mkdir(parents=True, exist_ok=False)
    results = []
    interrupted = False
    with (folder / "events.jsonl").open("x", encoding="utf-8", buffering=1) as stream:
        def emit(event, **data):
            line = json.dumps({"timestamp_utc": datetime.now(timezone.utc).isoformat(), "event": event, **data}, ensure_ascii=False)
            stream.write(line + "\n")
            print(line, flush=True)
        try:
            emit("run_started", requests=cases)
            for case in cases:
                emit("request_started", **case)
                result = measure(case, CONFIG["timeout_seconds"], emit)
                results.append(result)
                emit("request_finished", **result)
                if not result.get("ok"):
                    # Uma falha pode deixar SQL executando no servidor. Não iniciar outra área.
                    break
        except KeyboardInterrupt:
            interrupted = True
        finally:
            summary = {"results": results, "interrupted": interrupted, "expected": len(cases), "completed": len(results), "all_ok": len(results) == len(cases) and all(row.get("ok") for row in results), "limitation": "Envelope HTTP, não profile SQL ou aceite de desempenho; sem snapshot entre requisições."}
            (folder / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            emit("run_finished", report_dir=str(folder), all_ok=summary["all_ok"])


if __name__ == "__main__":
    mp.freeze_support()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
