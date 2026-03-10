Funcionalidades
Para Usuários:
✅ Login e registro de usuários
✅ Receber notificações em tempo real via WebSocket
✅ Contador de notificações não lidas (sino estilo YouTube/Facebook)
✅ Visualização rápida das últimas 10 notificações no dropdown
✅ Página completa para ver todas as notificações
✅ Listar todas as notificações com filtro de status
✅ Marcar notificação individual como lida
✅ Marcar todas as notificações como lidas
Para Administradores:
✅ Login fixo (admin/admin)
✅ Listar todos os usuários cadastrados
✅ Enviar notificações para usuários selecionados
✅ Seleção múltipla de usuários destinatários


 Como Usar
1. Criar Usuários
Acesse http://localhost:5173/login
Clique em "Criar conta"
Crie 2-3 usuários de teste (ex: user1, user2, user3)
2. Fazer Login como Admin
Acesse http://localhost:5173/admin/login
Use as credenciais fixas:
Usuário: admin
Senha: admin
Você verá o painel administrativo com a lista de usuários
3. Enviar Notificações
No painel admin, escreva uma mensagem
Selecione os usuários destinatários
Clique em "Enviar Notificação"
A notificação será salva no banco e enviada via RabbitMQ
4. Receber Notificações
Abra outra aba/janela do navegador
Acesse http://localhost:5173/login
Faça login com um dos usuários criados
Você verá o sino 🔔 no canto superior direito
Quando o admin enviar uma notificação, o contador será atualizado em tempo real
Clique no sino para ver as últimas 10 notificações em um dropdown
Clique em "Ver todas as notificações" para acessar a página completa
Na página de notificações, você pode:
Ver todas as notificações em formato de tabela
Filtrar por status (lida/não lida)
Marcar individualmente como lida
Marcar todas como lidas de uma vez
Clique em uma notificação para marcá-la como lida
