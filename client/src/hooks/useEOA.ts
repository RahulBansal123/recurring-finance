import { useCallback, useEffect, useState } from "react";
import { type Account, createWalletClient, http, parseUnits } from "viem";
import { sepolia } from "viem/chains";

import { publicClient, walletClient } from "@/config/web3";
import SessionKeyABI from "@/abis/sessionKey.json";
import { IMPLEMENTATION_7702 } from "@/config/constant";

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
		relayerAddress: string,
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
			args: [relayerAddress, BigInt(validUntil), parseUnits(dailyLimit, 6)],
		});

		await publicClient.waitForTransactionReceipt({
			hash,
			confirmations: 2,
		});

		return hash;
	};

	return { isSmartEOA, signDelegation };
};
