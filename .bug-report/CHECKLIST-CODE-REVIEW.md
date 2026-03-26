# Checklist de Code Review

- Verificar se scripts raiz cobrem todos os workspaces esperados.
- Verificar se utilitários de runtime tratam `localhost`, `127.0.0.1` e `[::1]` de forma consistente.
- Verificar se contratos HTTP evitam depender de body em `DELETE`.
- Verificar se testes de utilitários de URL cobrem IPv4, IPv6 e host remoto.
- Verificar se validações locais e CI têm a mesma cobertura prática.
