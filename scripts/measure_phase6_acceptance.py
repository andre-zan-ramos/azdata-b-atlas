"""Aceite manual Fase 6. Run Python File somente após preparar o servidor.

--dry-run valida o plano offline. Reutiliza o transporte limitado preexistente.
Não configura servidor, banco ou timeout SQL; confirmação é do operador.
"""
from datetime import datetime, timezone
import json
import multiprocessing as mp
from pathlib import Path
import sys
from urllib.parse import urlencode

from measure_cnpj_b2b import CONFIG as B2B_CONFIG, plan as b2b_plan
from measure_map_contracts import measure

CONFIG = {
    "server_limits_confirmed": False,
    "server_evidence": "",  # Referência ao log/configuração verificados pelo operador.
    "statement_timeout_ms": 5000,
    "lock_timeout_ms": 1000,
    "server_request_timeout_seconds": 15,
    "client_timeout_seconds": 20,
    "municipio_tom": "4123",
}


def plan():
    cases = []
    for case in b2b_plan():
        cases.append(case)
        cases.append({**case, "area": case["area"] + " lista", "url": case["url"].split("?")[0] + "resultados/?" + urlencode({**case["filters"], "page": 1, "page_size": 10, "include_total": "false"})})
    if not CONFIG["municipio_tom"].isascii() or not CONFIG["municipio_tom"].isdigit():
        raise ValueError("Município TOM deve ser código oficial literal.")
    origin = B2B_CONFIG["base_url"].rstrip("/") + "/api/v1/receita-federal/cno/obras/"
    filters = {"uf": B2B_CONFIG["filters"]["uf"], "codigo_municipio": CONFIG["municipio_tom"]}
    cases.extend([
        {"area": "Obras", "filters": filters, "url": origin + "mapa/?" + urlencode({**filters, "limit": 10})},
        {"area": "Obras lista", "filters": filters, "url": origin + "?" + urlencode({**filters, "page": 1, "page_size": 10, "include_total": "false"})},
    ])
    return cases


def main():
    cases = plan()
    if "--dry-run" in sys.argv:
        print(json.dumps({"limits": CONFIG, "requests": cases}, ensure_ascii=False, indent=2))
        return 0
    if not CONFIG["server_limits_confirmed"] or not CONFIG["server_evidence"].strip():
        raise ValueError("Confirme os limites reais do servidor e registre server_evidence antes de executar HTTP.")
    if not (0 < CONFIG["lock_timeout_ms"] < CONFIG["statement_timeout_ms"] < CONFIG["server_request_timeout_seconds"] * 1000 < CONFIG["client_timeout_seconds"] * 1000 <= 20000):
        raise ValueError("Limites devem obedecer lock < SQL < requisição servidor < cliente <= 20s.")
    folder = Path(__file__).resolve().parents[1] / "var/map-contract-measurements" / (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ") + "_phase6")
    folder.mkdir(parents=True, exist_ok=False)
    results = []
    with (folder / "events.jsonl").open("x", encoding="utf-8", buffering=1) as stream:
        def emit(event, **data):
            line = json.dumps({"timestamp_utc": datetime.now(timezone.utc).isoformat(), "event": event, **data}, ensure_ascii=False)
            stream.write(line + "\n")
            print(line, flush=True)
        interrupted = False
        try:
            emit("run_started", requests=cases, limits=CONFIG)
            for case in cases:
                emit("request_started", **case)
                result = measure(case, CONFIG["client_timeout_seconds"], emit)
                results.append(result)
                emit("request_finished", **result)
                if not result.get("ok"):
                    break
        except KeyboardInterrupt:
            interrupted = True
        finally:
            summary = {"timestamp_utc": datetime.now(timezone.utc).isoformat(), "limits": CONFIG, "results": results, "expected": len(cases), "completed": len(results), "interrupted": interrupted, "all_ok": len(results) == len(cases) and all(row.get("ok") for row in results), "limitation": "Limites servidor declarados pelo operador, não verificados pelo cliente. HTTP não mede SQL/memória. Metadados iguais não comprovam snapshot. Sucesso não é aceite de latência."}
            (folder / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            emit("run_finished", report_dir=str(folder), all_ok=summary["all_ok"])
    return 0 if summary["all_ok"] else 1


if __name__ == "__main__":
    mp.freeze_support()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
