"""Medição HTTP manual. Execute com Run Python File no VSCode.

Configuração pronta para Belo Horizonte/MG; clique em Run Python File.
Somente biblioteca padrão; não carrega Django nem conecta diretamente ao banco.
"""
from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import os
from pathlib import Path
import re
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

REPO = Path(__file__).resolve().parents[1]

# Configuração pronta para Run Python File: Belo Horizonte/MG.
# Receita/TOM 4123, conforme https://www.gov.br/receitafederal/dados/municipios.csv/view
# Origem vazia: usa VITE_AZDATA_API_BASE_URL do ambiente ou .env.local/.env.
# Não inferir o código Receita a partir do TOM, IBGE ou nome do município.
CONFIG = {
    "base_url": "http://127.0.0.1:8801",
    "uf": "MG",
    "municipio_receita": "4123",
    "municipio_tom": "4123",
    "limit": 10,
    "timeout_seconds": 20,
}
MAX_BYTES = 5 * 1024 * 1024


def configured_origin():
    if CONFIG["base_url"]:
        return CONFIG["base_url"]
    value = os.environ.get("VITE_AZDATA_API_BASE_URL", "")
    if value:
        return value
    for name in (".env.local", ".env"):
        path = REPO / name
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            key, separator, value = line.strip().partition("=")
            if separator and key == "VITE_AZDATA_API_BASE_URL":
                return value.strip().strip("\"'")
    return ""


def options(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=configured_origin())
    parser.add_argument("--uf", default=CONFIG["uf"])
    parser.add_argument("--municipio-receita", default=CONFIG["municipio_receita"])
    parser.add_argument("--municipio-tom", default=CONFIG["municipio_tom"])
    parser.add_argument("--limit", type=int, default=CONFIG["limit"])
    parser.add_argument("--timeout-seconds", type=int, default=CONFIG["timeout_seconds"])
    parser.add_argument("--output-dir", type=Path, default=REPO / "var/map-contract-measurements")
    parser.add_argument("--dry-run", action="store_true", help="Valida e imprime o plano, sem HTTP nem arquivos.")
    args = parser.parse_args(argv)
    origin = urlsplit(args.base_url)
    try:
        _ = origin.port
    except ValueError:
        parser.error("Porta inválida na origem da API.")
    if (origin.scheme not in {"http", "https"} or not origin.hostname
            or origin.username or origin.password or origin.query or origin.fragment
            or origin.path not in {"", "/"}):
        parser.error("Configure base_url como origem HTTP(S), sem credenciais, caminho ou query.")
    if args.uf not in "AC AL AP AM BA CE DF ES GO MA MG MT MS PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split():
        parser.error("Informe uma UF oficial em maiúsculas.")
    for name in ("municipio_receita", "municipio_tom"):
        if not re.fullmatch(r"[0-9]+", getattr(args, name)):
            parser.error(f"Preencha CONFIG['{name}'] ou --{name.replace('_', '-')} com o código oficial literal.")
    if not 1 <= args.limit <= 100 or not 1 <= args.timeout_seconds <= 20:
        parser.error("limit deve estar entre 1 e 100; timeout_seconds, entre 1 e 20.")
    args.base_url = f"{origin.scheme}://{origin.netloc}"
    return args


def plan(args):
    cases = (
        ("Empresas", "cnpj/estabelecimentos/mapa", "municipio", args.municipio_receita),
        ("Sócios", "cnpj/socios/mapa", "municipio", args.municipio_receita),
        ("Obras", "cno/obras/mapa", "codigo_municipio", args.municipio_tom),
    )
    return [{"area": area, "url": f"{args.base_url}/api/v1/receita-federal/{path}/?"
             + urlencode({"uf": args.uf, key: code, "limit": args.limit})}
            for area, path, key, code in cases]


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_once(url, timeout_seconds, sender):
    """Um GET; nenhuma repetição, redirecionamento, detalhe ou página extra."""
    started = time.perf_counter()
    result = {"status": None, "response_bytes": 0, "ok": False}
    try:
        opener = build_opener(NoRedirect())
        request = Request(url, headers={"Accept": "application/json", "User-Agent": "B-Atlas-Manual-Map-Measurement/1"}, method="GET")
        try:
            response = opener.open(request, timeout=timeout_seconds)
        except HTTPError as error:
            response = error
        with response:
            result["status"] = response.code
            payload = response.read(MAX_BYTES + 1)
        result["response_bytes"] = len(payload)
        if len(payload) > MAX_BYTES:
            raise ValueError("Resposta excedeu o teto de 5 MiB; leitura interrompida.")
        body = json.loads(payload)
        if not isinstance(body, dict):
            raise ValueError("Resposta JSON não é um objeto.")
        for key in ("release", "source_file_id", "filters", "coverage", "identity", "b2b_context"):
            result[key] = body.get(key)
        points = body.get("points")
        result["points_received"] = len(points) if isinstance(points, list) else None
        result["ok"] = 200 <= response.code < 300 and isinstance(points, list) and isinstance(body.get("coverage"), dict)
        if not result["ok"]:
            result["error"] = f"HTTP {response.code} ou envelope cartográfico inválido."
    except Exception as error:
        result["error"] = f"{type(error).__name__}: {error}"
    result["http_ms"] = round((time.perf_counter() - started) * 1000, 2)
    try:
        sender.send(result)
    finally:
        sender.close()


def measure(case, timeout_seconds, emit):
    # Processo isolado impõe prazo total, inclusive leitura lenta do corpo.
    context = mp.get_context("spawn")
    receiver, sender = context.Pipe(duplex=False)
    process = context.Process(target=request_once, args=(case["url"], timeout_seconds, sender), daemon=True)
    started = time.perf_counter()
    process.start()
    sender.close()
    result = None
    try:
        while time.perf_counter() - started < timeout_seconds:
            remaining = timeout_seconds - (time.perf_counter() - started)
            if receiver.poll(min(5, max(0, remaining))):
                try:
                    result = receiver.recv()
                except EOFError:
                    result = {"ok": False, "error": "Worker terminou sem resposta."}
                break
            if not process.is_alive():
                result = {"ok": False, "error": f"Worker terminou com código {process.exitcode}."}
                break
            emit("heartbeat", area=case["area"], elapsed_seconds=round(time.perf_counter() - started, 1))
        if result is None:
            result = {"ok": False, "status": None, "error": "Prazo total excedido; cliente interrompido. Consulta no servidor pode continuar."}
    finally:
        if process.is_alive():
            process.terminate()
        process.join(timeout=2)
        receiver.close()
    return {**case, **result, "elapsed_ms": round((time.perf_counter() - started) * 1000, 2)}


def main(argv=None):
    args = options(argv)
    cases = plan(args)
    if args.dry_run:
        print(json.dumps({"dry_run": True, "requests": cases}, ensure_ascii=False, indent=2))
        return 0
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    folder = args.output_dir.resolve() / stamp
    folder.mkdir(parents=True, exist_ok=False)
    events = folder / "events.jsonl"
    summary_path = folder / "summary.json"
    with events.open("x", encoding="utf-8", buffering=1) as stream:
        def emit(event, **data):
            row = {"timestamp_utc": datetime.now(timezone.utc).isoformat(), "event": event, **data}
            line = json.dumps(row, ensure_ascii=False)
            stream.write(line + "\n")
            print(line, flush=True)

        results = []
        emit("run_started", report_dir=str(folder), requests=cases, timeout_seconds=args.timeout_seconds, max_response_bytes=MAX_BYTES)
        interrupted = False
        try:
            for case in cases:
                emit("request_started", **case)
                result = measure(case, args.timeout_seconds, emit)
                results.append(result)
                emit("request_finished", **result)
        except KeyboardInterrupt:
            interrupted = True
            emit("run_interrupted", completed=len(results))
        finally:
            summary = {"interrupted": interrupted, "results": results,
                       "completed": len(results), "expected": 3,
                       "all_ok": len(results) == 3 and all(row["ok"] for row in results),
                       "limitation": "Tempo HTTP não é tempo SQL; timeout não garante cancelamento no servidor; limit não limita contagens."}
            summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            emit("run_finished", summary_file=str(summary_path), all_ok=summary["all_ok"], interrupted=interrupted)
    return 130 if interrupted else (0 if summary["all_ok"] else 1)


if __name__ == "__main__":
    mp.freeze_support()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
