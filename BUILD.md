# Rebuilding the protected page

`work/healthcare-system.html` is a gate shell. The real case study lives
encrypted in `assets/protected/healthcare.json` — AES-256-GCM, key derived
with PBKDF2-SHA256 at 310,000 iterations. Nothing readable is in the page.

To change the content or the passphrase you need the plaintext page. Keep a
copy outside the repo (or recover it from git history before the gate commit),
edit it, then re-encrypt:

    node encrypt.mjs <plaintext.html> assets/protected/healthcare.json "<passphrase>"

`encrypt.mjs` takes everything between `<main>` and `</main>` — so the page's
own `<script>` blocks must sit *inside* main or they will not be encrypted and
will not run after unlock.

## What this protects

Someone opening the URL, viewing source, or reading the deployed files sees
only ciphertext. It is as strong as the passphrase.

## What it does not protect

A weak or shared passphrase. And anyone you give it to can copy the content.
It is a courtesy lock for NDA work that contains no client data anyway — every
chart on that page is built from synthetic figures.
