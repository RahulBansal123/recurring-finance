# Recurring Finance 💰

A decentralized application (dApp) for automating cryptocurrency payments using smart wallet delegation and session keys. Built on Ethereum-compatible networks, this platform enables users to set up recurring payments with custom schedules, beneficiaries, and spending limits.

## 🌟 Features

### Core Functionality
- **Smart Wallet Integration**: Generate and manage smart EOA (Externally Owned Account) wallets
- **Session Key Management**: Delegate spending authority to relayers with daily limits and expiration dates
- **Recurring Payments**: Set up automated payments with complex cron-like schedules
- **Multi-Beneficiary Support**: Send payments to multiple recipients in a single transaction
- **Token Flexibility**: Support for any ERC-20 token (USDC, ETH, etc.)

### Advanced Scheduling
- **Flexible Timing**: Set start and end dates for payment schedules
- **Cron-like Scheduling**: Configure payments to run on specific:
  - Hours (24-hour format)
  - Days of the week
  - Days of the month
  - Months of the year
- **Real-time Preview**: Visual feedback showing your configured schedule

### Security & Control
- **Spending Limits**: Set daily spending limits for delegated accounts
- **Time-bound Delegation**: Session keys automatically expire
- **Smart Contract Security**: Built on audited smart contract patterns
- **Relayer Architecture**: Secure execution through trusted relayers

## 🏗️ Architecture

### Smart Contracts
- **DistributorFactory**: Creates and manages distributor contracts
- **Distributor**: Handles recurring payment logic and execution
- **Session Key System**: Manages delegation and spending limits

### Frontend Stack
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Wagmi**: Ethereum React hooks
- **Viem**: TypeScript Ethereum library
- **Lucide React**: Beautiful icons

### Web3 Integration
- **Smart Wallet Support**: ERC-7702 compatible
- **Multi-chain Ready**: Ethereum and compatible networks

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rahulbansal123/recurring-finance.git
   cd recurring-finance/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
    ```env
    NEXT_PUBLIC_PRIVATE_KEY=
    ```
    For local development, you can use the following private key:
    ```env
    NEXT_PUBLIC_PRIVATE_KEY=0x22ea21180cde9a963a303deb128a1d04bcf8e4735492d53c1dfd040522c18b04
    ```


4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.


## 💡 Usage

### Setting Up Recurring Payments

1. **Connect Your Wallet**
   - Click "Generate Wallet" to create a new smart wallet

2. **Deploy Distributor**
   - Click "Deploy Distributor" to deploy a new Distributor contract from the DistributorFactory

2. **Add Session Key**
   - Distributor contract address is used as the delegated relayer address
   - Set daily spending limit
   - Choose expiration date
   - Sign the delegation transaction

3. **Schedule Payments**
   - Set start and end dates
   - Configure execution schedule (hours, days, months)
   - Add beneficiaries and amounts
   - Choose tokens and fee structure
   - Submit the recurring payment setup

4. **Distribute**
   - Anyone can distribute the payments to all beneficiaries
   - There is also a test function to test the payments

## 🙏 Acknowledgments

- **OpenZeppelin** 
- **Viem and Wagmi**
- **Tailwind CSS**
- **Next.js**
