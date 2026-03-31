# Monitoramento

## Metricas uteis

- Quantidade de uploads KML/KMZ por dia.
- Taxa de sucesso vs falha do endpoint `/api/v1/kml-postes/standardize`.
- Tempo medio de processamento por arquivo.
- Contagem de placemarks renomeados, ignorados e pulados por execucao.

## Logs

- Logar falhas de parse XML e de leitura de KMZ com nome do arquivo e modo utilizado.
- Logar erros de validacao de upload sem registrar conteudo sensivel do arquivo.

## Alertas

- Alerta para pico de falhas 4xx/5xx no endpoint KML/KMZ.
- Alerta para crescimento anormal do tempo de processamento.

## Tracing

- Medir etapas: upload recebido, parse KML/KMZ, padronizacao, serializacao, resposta.

## Health checks

- Manter `GET /api/v1/kml-postes/health` habilitado quando a feature estiver ativa.

## Sinais de producao

- Prefixos frequentemente rejeitados ou vazios.
- Percentual alto de `skippedNames` em arquivos operacionais.
- Arquivos `.kmz` sem `doc.kml` ou sem KML interno valido.
