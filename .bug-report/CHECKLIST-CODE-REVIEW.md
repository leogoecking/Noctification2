# Checklist de Code Review

- Confirmar se listas com potencial de crescimento possuem paginação ou limite explicito de renderizacao.
- Verificar se estado de pagina e total de paginas sao reajustados quando a fonte de dados muda.
- Garantir que mudancas de UI tenham teste focalizado para o comportamento novo.
- Confirmar que correcoes locais nao alteram contratos de API sem necessidade.
