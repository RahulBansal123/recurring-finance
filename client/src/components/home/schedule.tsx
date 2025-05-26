import { publicClient, walletClient } from "@/config/web3";
import { useEOA } from "@/hooks/useEOA";
import {
	Calendar,
	Clock,
	Coins,
	DollarSign,
	Key,
	Plus,
	Shield,
	Trash2,
	Users,
	Wallet,
} from "lucide-react";
import { parseUnits, type Account } from "viem";
import { DISTRIBUTOR_FACTORY, MOCK_USDC } from "@/config/constant";

import DistributorFactoryABI from "@/abis/distributorFactory.json";
import DistributorABI from "@/abis/distributor.json";
import { useReadContract } from "wagmi";
import { toast } from "sonner";
import { useState } from "react";

const hours = Array.from({ length: 24 }, (_, i) => i);
const daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);
const months = [
	{ value: 1, label: "Jan" },
	{ value: 2, label: "Feb" },
	{ value: 3, label: "Mar" },
	{ value: 4, label: "Apr" },
	{ value: 5, label: "May" },
	{ value: 6, label: "Jun" },
	{ value: 7, label: "Jul" },
	{ value: 8, label: "Aug" },
	{ value: 9, label: "Sep" },
	{ value: 10, label: "Oct" },
	{ value: 11, label: "Nov" },
	{ value: 12, label: "Dec" },
];
const daysOfWeek = [
	{ value: 0, label: "Mon" },
	{ value: 1, label: "Tue" },
	{ value: 2, label: "Wed" },
	{ value: 3, label: "Thu" },
	{ value: 4, label: "Fri" },
	{ value: 5, label: "Sat" },
	{ value: 6, label: "Sun" },
];

export const SchedulePayment = ({
	account,
	onComplete,
}: {
	account: Account;
	onComplete: () => void;
}) => {
	const { isSmartEOA } = useEOA({
		account,
	});

	const { data: distributors } = useReadContract({
		abi: DistributorFactoryABI,
		address: DISTRIBUTOR_FACTORY,
		functionName: "getOwnerDistributors",
		args: [account.address],
	});

	const [loading, setLoading] = useState(false);
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");

	// Cron schedule state
	const [selectedHours, setSelectedHours] = useState([9]);
	const [selectedDaysOfMonth, setSelectedDaysOfMonth] = useState<number[]>([]);
	const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
	const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState([1, 2, 3, 4, 5]);

	// Beneficiaries state
	const [beneficiaries, setBeneficiaries] = useState([
		{ address: "", amount: "" },
		{ address: "", amount: "" },
	]);

	const [tokenToDistribute] = useState(MOCK_USDC);
	const [feeToken] = useState(MOCK_USDC);
	const [feeAmount, setFeeAmount] = useState("1");

	const addBeneficiary = () => {
		setBeneficiaries([...beneficiaries, { address: "", amount: "" }]);
	};

	const removeBeneficiary = (index: number) => {
		setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
	};

	const updateBeneficiary = (index: number, field: string, value: string) => {
		const updated = beneficiaries.map((ben, i) =>
			i === index ? { ...ben, [field]: value } : ben,
		);
		setBeneficiaries(updated);
	};

	const toggleSelection = (
		value: number,
		currentSelection: number[],
		setter: (value: number[]) => void,
	) => {
		if (currentSelection.includes(value)) {
			setter(currentSelection.filter((item) => item !== value));
		} else {
			setter([...currentSelection, value]);
		}
	};

	const handleSchedule = async () => {
		if (!distributors) return;
		const latestDistributor = distributors[distributors.length - 1];
		if (!latestDistributor) {
			toast.error("No distributor found");
			return;
		}

		if (
			!startTime ||
			!endTime ||
			!selectedHours.length ||
			!beneficiaries.length
		) {
			toast.error("Please fill in all fields");
			return;
		}

		// Prepare beneficiaries data
		const beneficiaryAddresses = beneficiaries
			.map((b) => b.address)
			.filter((addr) => addr);
		const beneficiaryAmounts = beneficiaries
			.map((b) => (b.amount ? parseUnits(b.amount, 6).toString() : "0"))
			.filter((amt) => amt !== "0");

		const args = [
			[Math.floor(new Date(startTime).getTime() / 1000)], // _startTimes
			[Math.floor(new Date(endTime).getTime() / 1000)], // _endTimes
			[
				{
					hrs: selectedHours,
					daysOfMonth: selectedDaysOfMonth,
					months: selectedMonths,
					daysOfWeek: selectedDaysOfWeek,
				},
			], // _cronSchedules
			[beneficiaryAddresses], // _beneficiaries
			[beneficiaryAmounts], // _beneficiariesAmounts
			[tokenToDistribute], // _tokensToDistribute
			[feeToken], // _distributionFeeTokens
			[(Number.parseFloat(feeAmount) * 1000000).toString()], // _distributionFeeAmounts
		];
		setLoading(true);

		try {
			const hash = await walletClient.writeContract({
				account,
				abi: DistributorABI,
				address: latestDistributor,
				functionName: "createRecurringPayments",
				args: args,
			});
			console.log({ hash });
			await publicClient.waitForTransactionReceipt({
				hash,
				confirmations: 2,
			});

			toast.success("Recurring payment scheduled successfully");
			onComplete();
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-100">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-green-100 rounded-lg">
						<Wallet className="w-5 h-5 text-green-600" />
					</div>
					<h2 className="text-xl font-semibold text-gray-800">
						Wallet Connected
					</h2>
				</div>

				<div className="grid md:grid-cols-3 gap-4">
					<div className="bg-white rounded-lg p-4 border border-green-100">
						<div className="flex items-center gap-2 mb-2">
							<Shield className="w-4 h-4 text-gray-500" />
							<span className="text-sm font-medium text-gray-500">
								Wallet Address
							</span>
						</div>
						<p className="font-mono text-sm text-gray-800 break-all">
							{account.address}
						</p>
					</div>

					{distributors?.length > 0 && (
						<div className="bg-white rounded-lg p-4 border border-green-100">
							<div className="flex items-center gap-2 mb-2">
								<Shield className="w-4 h-4 text-gray-500" />
								<span className="text-sm font-medium text-gray-500">
									Distributor Address
								</span>
							</div>
							<p className="font-mono text-sm text-gray-800 break-all">
								{distributors[distributors.length - 1]}
							</p>
						</div>
					)}

					<div className="bg-white rounded-lg p-4 border border-green-100">
						<div className="flex items-center gap-2 mb-2">
							<Key className="w-4 h-4 text-gray-500" />
							<span className="text-sm font-medium text-gray-500">
								Smart EOA Status
							</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className={`w-2 h-2 rounded-full ${isSmartEOA ? "bg-green-500" : "bg-red-500"}`}
							/>
							<span className="text-sm font-medium">
								{isSmartEOA ? "Enabled" : "Disabled"}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-blue-100 rounded-lg">
						<Key className="w-5 h-5 text-blue-600" />
					</div>
					<h2 className="text-xl font-semibold text-gray-800">
						Schedule recurring payment
					</h2>
				</div>

				<div>
					<div className="p-6 border-b border-gray-100">
						<div className="flex items-center gap-3 mb-4">
							<Calendar className="w-5 h-5 text-blue-600" />
							<h2 className="text-xl font-semibold text-gray-800">
								Schedule Timing
							</h2>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="start-date"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Start Date & Time
								</label>
								<input
									id="start-date"
									type="datetime-local"
									value={startTime}
									onChange={(e) => setStartTime(e.target.value)}
									className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label
									htmlFor="end-date"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									End Date & Time
								</label>
								<input
									id="end-date"
									type="datetime-local"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					{/* Cron Schedule */}
					<div className="p-6 border-b border-gray-100">
						<div className="flex items-center gap-3 mb-4">
							<Clock className="w-5 h-5 text-purple-600" />
							<h2 className="text-xl font-semibold text-gray-800">
								Execution Schedule
							</h2>
						</div>

						<div className="space-y-6">
							{/* Hours */}
							<div>
								<p className="block text-sm font-medium text-gray-700 mb-2">
									Hours (24-hour format)
								</p>
								<div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
									{hours.map((hour) => (
										<button
											key={hour}
											type="button"
											onClick={() =>
												toggleSelection(hour, selectedHours, setSelectedHours)
											}
											className={`p-2 text-sm rounded-lg border transition-all ${
												selectedHours.includes(hour)
													? "bg-blue-500 text-white border-blue-500"
													: "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
											}`}
										>
											{hour.toString().padStart(2, "0")}
										</button>
									))}
								</div>
							</div>

							{/* Days of Week */}
							<div>
								<p className="block text-sm font-medium text-gray-700 mb-2">
									Days of Week
								</p>
								<div className="flex flex-wrap gap-2">
									{daysOfWeek.map((day) => (
										<button
											key={day.value}
											type="button"
											onClick={() =>
												toggleSelection(
													day.value,
													selectedDaysOfWeek,
													setSelectedDaysOfWeek,
												)
											}
											className={`px-4 py-2 text-sm rounded-lg border transition-all ${
												selectedDaysOfWeek.includes(day.value)
													? "bg-purple-500 text-white border-purple-500"
													: "bg-white text-gray-700 border-gray-300 hover:border-purple-300"
											}`}
										>
											{day.label}
										</button>
									))}
								</div>
							</div>

							{/* Days of Month */}
							<div>
								<p className="block text-sm font-medium text-gray-700 mb-2">
									Days of Month (optional)
								</p>
								<div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-1">
									{daysOfMonth.map((day) => (
										<button
											key={day}
											type="button"
											onClick={() =>
												toggleSelection(
													day,
													selectedDaysOfMonth,
													setSelectedDaysOfMonth,
												)
											}
											className={`p-2 text-sm rounded border transition-all ${
												selectedDaysOfMonth.includes(day)
													? "bg-green-500 text-white border-green-500"
													: "bg-white text-gray-700 border-gray-300 hover:border-green-300"
											}`}
										>
											{day}
										</button>
									))}
								</div>
							</div>

							{/* Months */}
							<div>
								<p className="block text-sm font-medium text-gray-700 mb-2">
									Months (optional)
								</p>
								<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
									{months.map((month) => (
										<button
											key={month.value}
											type="button"
											onClick={() =>
												toggleSelection(
													month.value,
													selectedMonths,
													setSelectedMonths,
												)
											}
											className={`px-3 py-2 text-sm rounded-lg border transition-all ${
												selectedMonths.includes(month.value)
													? "bg-orange-500 text-white border-orange-500"
													: "bg-white text-gray-700 border-gray-300 hover:border-orange-300"
											}`}
										>
											{month.label}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Beneficiaries */}
					<div className="p-6 border-b border-gray-100">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<Users className="w-5 h-5 text-green-600" />
								<h2 className="text-xl font-semibold text-gray-800">
									Beneficiaries
								</h2>
							</div>
							<button
								type="button"
								onClick={addBeneficiary}
								className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
							>
								<Plus className="w-4 h-4" />
								Add Beneficiary
							</button>
						</div>

						<div className="space-y-4">
							{beneficiaries.map((beneficiary, index) => (
								<div
									key={`beneficiary-${index}`}
									className="flex gap-4 items-end"
								>
									<div className="flex-1">
										<label
											htmlFor={`beneficiary-address-${index}`}
											className="block text-sm font-medium text-gray-700 mb-2"
										>
											Wallet Address
										</label>
										<input
											id={`beneficiary-address-${index}`}
											type="text"
											placeholder="0x1234567890abcdef..."
											value={beneficiary.address}
											onChange={(e) =>
												updateBeneficiary(index, "address", e.target.value)
											}
											className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
									<div className="w-32">
										<label
											htmlFor={`beneficiary-amount-${index}`}
											className="block text-sm font-medium text-gray-700 mb-2"
										>
											Amount (USDC)
										</label>
										<input
											id={`beneficiary-amount-${index}`}
											type="number"
											placeholder="100"
											value={beneficiary.amount}
											onChange={(e) =>
												updateBeneficiary(index, "amount", e.target.value)
											}
											className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
									{beneficiaries.length > 1 && (
										<button
											type="button"
											onClick={() => removeBeneficiary(index)}
											className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
										>
											<Trash2 className="w-5 h-5" />
										</button>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Token Configuration */}
					<div className="p-6">
						<div className="flex items-center gap-3 mb-4">
							<Coins className="w-5 h-5 text-yellow-600" />
							<h2 className="text-xl font-semibold text-gray-800">
								Token Configuration
							</h2>
						</div>

						<div className="space-y-4">
							<div>
								<label
									htmlFor="token-to-distribute"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Token to Distribute (USDC)
								</label>
								<input
									id="token-to-distribute"
									type="text"
									placeholder="Token contract address (USDC)"
									value={tokenToDistribute}
									disabled
									className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:!bg-gray-200 disabled:text-gray-900"
								/>
							</div>

							<div className="grid md:grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="fee-token"
										className="block text-sm font-medium text-gray-700 mb-2"
									>
										Fee Token Address
									</label>
									<input
										id="fee-token"
										type="text"
										placeholder="Fee token contract address"
										value={feeToken}
										disabled
										className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:!bg-gray-200 disabled:text-gray-900"
									/>
								</div>
								<div>
									<label
										htmlFor="fee-amount"
										className="block text-sm font-medium text-gray-700 mb-2"
									>
										Fee Amount
									</label>
									<div className="relative">
										<DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
										<input
											id="fee-amount"
											type="number"
											placeholder="1.0"
											value={feeAmount}
											onChange={(e) => setFeeAmount(e.target.value)}
											className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								</div>
							</div>
						</div>
					</div>

					<button
						type="button"
						className="submit-btn"
						disabled={loading}
						onClick={handleSchedule}
					>
						{loading ? "Scheduling..." : "Schedule"}
					</button>
				</div>
			</div>
		</>
	);
};
