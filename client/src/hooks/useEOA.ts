import { useCallback, useEffect, useState } from "react";
import { type Account, parseUnits } from "viem";

import { publicClient, relayerWalletClient, walletClient } from "@/config/web3";
import { DISTRIBUTOR, IMPLEMENTATION_7702, MOCK_USDC, PLATFORM_ADDRESS } from "@/config/constant";
import SessionKeyABI from "@/abis/sessionKey.json"
import DistributorABI from '@/abis/distributor.json';
;

export const useEOA = ({ account }: { account?: Account }) => {
	const [isSmartEOA, setIsSmartEOA] = useState(false);

	const checkEOA = useCallback(async () => {
		if (!account) return;

		const byteCode = await publicClient.getCode({ address: account.address });
		if (byteCode?.startsWith("0xef0100")) setIsSmartEOA(true);
	}, [account]);

	useEffect(() => {
		if (!account) return;
		checkEOA();

		const interval = setInterval(() => {
			checkEOA();
		}, 30000);

		return () => clearInterval(interval);
	}, [account, checkEOA]);

	const signDelegation = async (
		delegateAddress: string,
		dailyLimit: string,
		validUntil: number,
	) => {
		if (!account) return;

		const authorization = await walletClient.signAuthorization({
			account,
			contractAddress: IMPLEMENTATION_7702,
			executor: "self",
		});

		const hash = await walletClient.writeContract({
			account,
			authorizationList: [authorization],
			abi: SessionKeyABI,
			address: account.address,
			functionName: "addSessionKey",
			args: [delegateAddress, BigInt(validUntil), parseUnits(dailyLimit, 6)],
		});
		console.log(`Session key signed successfully: ${hash}`);

		await publicClient.waitForTransactionReceipt({
			hash,
			confirmations: 2,
		});

		return hash;
	};

	const schedulePayment = async (pullHourly: string, validUntil: number) => {
		if (!account) return;
		try {
			const now = new Date();
			const startTime = Math.floor(now.getTime() / 1000) - 60 * 60 * 24;

			// Set up daily recurring payment to pull hourly
			const cronSchedule = {
				hrs: [],
				daysOfMonth: [],
				months: [],
				daysOfWeek: [],
			};

			const args = [
				account.address, // _owner
				startTime, // _startTime
				validUntil, // _endTime
				cronSchedule, // _cronSchedule
				[PLATFORM_ADDRESS], // _beneficiary (platform address)
				[parseUnits(pullHourly, 6)], // _beneficiaryAmount (daily limit amount)
				MOCK_USDC, // _tokenToDistribute (USDC token address)
			];

			const hash = await relayerWalletClient.writeContract({
				abi: DistributorABI,
				address: DISTRIBUTOR,
				functionName: 'createRecurringPayment',
				args: args,
			});

			console.log(`Recurring payment scheduled successfully: ${hash}`);
			await publicClient.waitForTransactionReceipt({
				hash,
				confirmations: 2,
			});
		} catch (error) {
			console.error(`Failed to schedule payment: ${error}`);
		}
	}

	return { isSmartEOA, signDelegation, schedulePayment };
};
