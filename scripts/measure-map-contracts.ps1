param(
    [Parameter(Mandatory)][uri]$BaseUrl,
    [Parameter(Mandatory)][ValidatePattern('^[A-Z]{2}$')][string]$Uf,
    [Parameter(Mandatory)][ValidatePattern('^[0-9]+$')][string]$MunicipioReceita,
    [Parameter(Mandatory)][ValidatePattern('^[0-9]+$')][string]$MunicipioTom,
    [ValidateRange(1, 100)][int]$Limit = 10
)
# Manual only. Three GETs, once each; no retry, details, POST or pagination loop.
if ($BaseUrl.Scheme -notin @('http', 'https')) { throw 'Use an HTTP(S) API origin.' }
$origin = $BaseUrl.AbsoluteUri.TrimEnd('/')
$cases = @(
    @{ Area = 'Empresas'; Path = 'cnpj/estabelecimentos/mapa'; Municipality = "municipio=$MunicipioReceita" },
    @{ Area = 'Socios'; Path = 'cnpj/socios/mapa'; Municipality = "municipio=$MunicipioReceita" },
    @{ Area = 'Obras'; Path = 'cno/obras/mapa'; Municipality = "codigo_municipio=$MunicipioTom" }
)
foreach ($case in $cases) {
    $target = "$origin/api/v1/receita-federal/$($case.Path)/?uf=$Uf&$($case.Municipality)&limit=$Limit"
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $target -Method Get -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
        $timer.Stop()
        $body = $response.Content | ConvertFrom-Json
        [pscustomobject]@{
            area = $case.Area; status = [int]$response.StatusCode
            milliseconds = $timer.ElapsedMilliseconds
            utf8_bytes = [System.Text.Encoding]::UTF8.GetByteCount($response.Content)
            release = $body.release; coverage = $body.coverage; filters = $body.filters
        } | ConvertTo-Json -Depth 5 -Compress
    } catch {
        $timer.Stop()
        [pscustomobject]@{ area = $case.Area; milliseconds = $timer.ElapsedMilliseconds; error = $_.Exception.Message } | ConvertTo-Json -Compress
    }
}
