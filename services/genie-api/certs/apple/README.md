# Apple root certificates for App Store notification verification

The App Store webhook handler (`api/webhook-payment.ts`) verifies Apple's signed JWS against a
root certificate anchored here. Without a root certificate the handler fails closed and never
grants entitlement, so this file must be present in production.

## What to place here

Download Apple Root CA - G3 (DER, `.cer`) from Apple's certificate authority page and save it
in this directory:

    https://www.apple.com/certificateauthority/AppleRootCA-G3.cer

Any file in this directory ending in `.cer`, `.der`, `.pem`, or `.crt` is loaded as a trust
anchor. You can add more than one if Apple rotates roots. To point the handler at a different
directory instead, set `APPLE_ROOT_CERTS_DIR`.

## Why the certificate is not committed

Certificates are public, but they are binary trust anchors that should be fetched from Apple's
official source and reviewed, not copied from a repository. Fetch it as part of deployment.

## Related environment variables

    APPLE_BUNDLE_ID=world.cyberskill.genieamlich
    APPLE_APP_APPLE_ID=<your numeric App Store app id>
    APP_STORE_ENVIRONMENT=Sandbox   # or Production
    APP_STORE_ONLINE_CHECKS=false   # set true to enable OCSP revocation checks
    # APP_STORE_PRODUCT_TIERS={"com.cyberskill.genie.premium.monthly":"premium","com.cyberskill.genie.family.yearly":"family"}
    # APPLE_ROOT_CERTS_DIR=/absolute/path/to/certs   # optional override
