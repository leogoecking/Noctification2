#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"

CERTS_DIR="${CERTS_DIR:-$PROJECT_ROOT/.deploy/certs}"
HOSTNAME_VALUE="${HOSTNAME_VALUE:-noctification.lan}"
ROOT_CA_KEY="$CERTS_DIR/local-root-ca.key"
ROOT_CA_CERT="$CERTS_DIR/local-root-ca.pem"
SERVER_KEY="$CERTS_DIR/${HOSTNAME_VALUE}-key.pem"
SERVER_CSR="$CERTS_DIR/${HOSTNAME_VALUE}.csr"
SERVER_CERT="$CERTS_DIR/${HOSTNAME_VALUE}.pem"
SERVER_EXT="$CERTS_DIR/${HOSTNAME_VALUE}.ext"

mkdir -p "$CERTS_DIR"

if [[ ! -f "$ROOT_CA_KEY" || ! -f "$ROOT_CA_CERT" ]]; then
  openssl genrsa -out "$ROOT_CA_KEY" 4096 >/dev/null 2>&1
  openssl req -x509 -new -nodes -key "$ROOT_CA_KEY" -sha256 -days 3650 \
    -out "$ROOT_CA_CERT" \
    -subj "/C=BR/ST=Bahia/L=Salvador/O=Noctification Local/CN=Noctification Local Root CA" >/dev/null 2>&1
fi

cat >"$SERVER_EXT" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${HOSTNAME_VALUE}
EOF

openssl genrsa -out "$SERVER_KEY" 2048 >/dev/null 2>&1
openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" \
  -subj "/C=BR/ST=Bahia/L=Salvador/O=Noctification Local/CN=${HOSTNAME_VALUE}" >/dev/null 2>&1
openssl x509 -req -in "$SERVER_CSR" -CA "$ROOT_CA_CERT" -CAkey "$ROOT_CA_KEY" \
  -CAcreateserial -out "$SERVER_CERT" -days 825 -sha256 -extfile "$SERVER_EXT" >/dev/null 2>&1

rm -f "$SERVER_CSR" "$SERVER_EXT"

cat <<EOF
Certificados gerados em:
- CA raiz: $ROOT_CA_CERT
- Chave da CA: $ROOT_CA_KEY
- Certificado do servidor: $SERVER_CERT
- Chave do servidor: $SERVER_KEY

Proximos passos:
1. Instale a CA raiz ($ROOT_CA_CERT) nos dispositivos da rede.
2. Aponte ${HOSTNAME_VALUE} para o IP desta maquina no DNS local ou no arquivo hosts.
3. Copie o certificado e a chave do servidor para /etc/noctification/certs/:
   - ${HOSTNAME_VALUE}.pem
   - ${HOSTNAME_VALUE}-key.pem
EOF
