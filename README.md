# @x402nano/facilitator

[![x402](https://img.shields.io/badge/protocol-x402-0066ff?style=flat-square)](https://www.x402.org)
[![Nano](https://img.shields.io/badge/crypto-Nano-4fc0d0?style=flat-square&logo=nano)](https://nano.org)

x402 Protocol **`Facilitator`** for the Nano network. Verifies and settles x402 Nano payloads, acting as a bridge between a **`Resource Server`** and the Nano network.

## Features
- **Verification**: Verifies Nano blocks within x402 payment payloads.
- **Settlement**: Settles (confirms) Nano blocks contained within x402 payment payloads onto the Nano network.
- **Scheme support**: Supports the [@x402nano/exact](https://github.com/x402nano/exact) scheme.
- **Security**: Optional Bearer Token authentication for secured access.
- **Logging**: Built-in structured logging to standard Docker container log (via Bunyan).

## Prerequisites
- [Git](https://git-scm.com/) installed
- [Docker](https://docs.docker.com/get-started/get-docker/) installed
- Access to a working Nano RPC URL

## Installation & Setup

1. Clone this repository and then navigate to newly created `facilitator` directory,
```
git clone https://github.com/x402nano/facilitator.git
cd facilitator
```

2. Duplicate/copy `.env.example` to new file `.env`

```
cp .env.example .env
```

3. Inside `.env`, set environment variables as required:

| Environment Variable | Description |	Required | Default |
| --- | --- |	--- | --- |
| NANO_RPC_URL | URL of the Nano RPC | **Yes** | - |
| PORT | Port number to run this **`Facilitator`** on | **Yes** | - |
| AUTHORIZATION_BEARER_TOKEN | If set, enables Bearer authentication on all endpoints. Leave blank to disable Bearer authentication | No | - |
| ENABLE_LOGGING | Set to `true` to enable logging. Logs to standard Docker container log | No | `true` |
| LOGGING_VERBOSE | Set to `true` to include greater detail in logs | No | `false` |
| X402_NETWORK_IDENTIFIER | The Nano network to use (CAIP-2 standard network identifier) | No | `nano:mainnet` |

4. Run the Docker container
```
docker compose up -d
```

**`Facilitator`** should now be running on the `PORT` Environment Variable.

If you update any of the Environment Variables in `.env` run `docker compose up -d` again to make the changes take effect.

## Facilitator Endpoints

`POST /verify`

Verifies a Nano payment payload against payment requirements (e.g., balance checks, block structure) without broadcasting it to the Nano network.

`POST /settle`

Settles the Nano payment payload on the Nano network.

`GET /supported`

Returns a list of supported x402 schemes and networks currently registered to this **`Facilitator`**. Currently matches the network identifier set in the `X402_NETWORK_IDENTIFIER` Environment Variable (defaults to `nano:mainnet`)

## Related Links
- [@x402nano/schemes/exact](https://github.com/x402nano/schemes/blob/main/exact.md) – Scheme document for the `exact` scheme
- [@x402nano/exact](https://github.com/x402nano/exact) – Implementation of `exact` scheme for fixed-amount Nano (XNO) payments over x402 protocol
- [x402.org](https://www.x402.org) – Official x402 protocol website
- [nano.org](https://nano.org) – Official Nano website

## License

MIT