ALTER TABLE operations_board_messages
  ADD COLUMN category TEXT NOT NULL DEFAULT 'geral'
  CHECK (category IN ('urgente', 'info', 'aviso', 'comunicado', 'procedimento', 'geral'));
