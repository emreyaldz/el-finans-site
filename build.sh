#!/usr/bin/env bash
# Cloudflare Workers static assets derleme adımı.
#
# Yayına çıkacak dosyaları dist/ altında toplar. Site statik olduğu için
# gerçek bir derleme yapılmaz; buradaki tek iş, repo private olduktan sonra
# da iç dokümanların elfinans.com üzerinden servis edilmesini engellemektir.
#
# Yeni bir sayfa veya görsel eklendiğinde bu dosyaya dokunmak gerekmez;
# yalnızca aşağıdaki EXCLUDE listesindekiler yayın dışında kalır.
# Nokta ile başlayan dizinler bilerek dahil edilir; ileride Android App Links
# ya da benzeri bir doğrulama için .well-known/ eklenirse yayına çıkması gerekir.
set -euo pipefail

DIST="dist"

EXCLUDE=(
  # Derleme çıktısı ve sürüm kontrolü
  "$DIST"
  .git
  .gitattributes
  .gitignore
  # Yerel araç konfigürasyonları
  .claude
  .agents
  .codex
  .github
  # Derleme ve dağıtım yapılandırması
  build.sh
  wrangler.jsonc
  wrangler.toml
  .assetsignore
  # İç dokümanlar — repo private olduğunda yayına çıkmamalı
  AGENTS.md
  README.md
  SITE_CONTEXT.md
  # Yalnızca GitHub Pages'in ihtiyaç duyduğu artifakt
  CNAME
)

rm -rf "$DIST"
mkdir -p "$DIST"

shopt -s dotglob nullglob
for entry in *; do
  for excluded in "${EXCLUDE[@]}"; do
    if [ "$entry" = "$excluded" ]; then
      continue 2
    fi
  done
  cp -R "$entry" "$DIST/"
done

echo "Yayına hazır dosyalar:"
ls -1A "$DIST"
