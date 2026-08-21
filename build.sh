#!/usr/bin/env bash
# Cloudflare Pages derleme adımı.
#
# Yayına çıkacak dosyaları dist/ altında toplar. Site statik olduğu için
# gerçek bir derleme yapılmaz; buradaki tek iş, repo private olduktan sonra
# da iç dokümanların elfinans.com üzerinden servis edilmesini engellemektir.
#
# Yeni bir sayfa veya varlık eklendiğinde bu dosyaya dokunmak gerekmez;
# yalnızca aşağıdaki EXCLUDE listesindekiler yayın dışında kalır.
# Nokta ile başlayan dizinler bilerek dahil edilir; ileride Android App Links
# ya da benzeri bir doğrulama için .well-known/ eklenirse yayına çıkması gerekir.
set -euo pipefail

DIST="dist"

# Yayına dahil edilmeyenler: iç dokümanlar, yerel araç konfigürasyonları ve
# yalnızca GitHub Pages'in ihtiyaç duyduğu CNAME dosyası.
EXCLUDE=(
  "$DIST"
  .git
  .github
  .claude
  .agents
  .codex
  .gitignore
  build.sh
  AGENTS.md
  README.md
  SITE_CONTEXT.md
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
