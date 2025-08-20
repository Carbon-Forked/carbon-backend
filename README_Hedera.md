# Carbon Backend

Carbon Backend, built with [Nest.js](https://nestjs.com), serves as a specialized backend solution for aggregating insights from Carbon smart contracts and delivering them through APIs. It provides a suite of APIs offering valuable insights, such as trading activity and history.

## Prerequisites

Before setting up Carbon Backend, ensure you have the following prerequisites:

- **[CoinGecko](https://www.coingecko.com/en/api)**: Obtain an API key from CoinGecko.
  - This repo is set up to use Coingecko's PRO API, if you have a free plan you will need to adjust the coingecko api url and authentication header.
- **[CoinMarketCap](https://www.coingecko.com/en/api)**: Obtain an API key from CoinMarketCap.
- **[Codex](https://www.codex.io/)**: Obtain an API key from Codex.

## Installation and usage

To set up Carbon Backend, follow these steps:

1. Clone the repository:

   ```bash
   git clone git@github.com:Carbon-Forked/carbon-backend.git
   ```

2. Navigate to the project directory:

   ```bash
   cd carbon-backend
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Run docker for installed and running Redis and TimescaleDB:

   ```bash
   docker compose up -d
   ```

5. Run database migrations:

   After installing dependencies, run the following command to execute all migrations and prepare the database:

   ```bash
   npm run migration:run
   ```

6. Configure environment variables:

   Duplicate the `.env.example` file as `.env`:

   ```bash
   cp .env.example .env
   ```

   Provide the required values in the `.env` file.

7. Start backend:

   ```bash
   npm start
   ```
