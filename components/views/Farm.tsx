import { Card, CardContent, Typography, CardActions, Button, Tooltip, Toolbar, Tab, Tabs, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Slider, CardHeader, Grid, Collapse, List, Avatar, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Divider, ListItemButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Badge } from "@mui/material";
import { Box } from "@mui/system";
import Image from 'next/image';
import { useWeb3React } from "@web3-react/core";
import React, { useState } from "react";

import { Contract, ethers, BigNumber, utils } from "ethers";
import moment from "moment";
import { useGlobalState, setGlobalState, getGlobalState } from "../core/StateManager";
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getBNBbalance } from "../core/Service";
import { useSnackbar } from 'notistack';
import { maxIndex } from "d3-array";
import xUSD_logo from "./../../resources/xusd_logo.png";
import sADA_logo from "./../../resources/sADA_logo.png";
import sUSELESS_logo from "./../../resources/sUSELESS_logo.png";
import BNB_logo from "./../../resources/BNB_logo.png";
import sBTC_logo from "./../../resources/sBTC_logo.png";
const logos = {
	"xUSD_logo": xUSD_logo,
	"sADA_logo": sADA_logo,
	"sUSELESS_logo": sUSELESS_logo,
	"SUSE_logo": sUSELESS_logo,
	"BNB_logo": BNB_logo,
	"sBTC_logo": sBTC_logo,
}
import { gql, useQuery } from '@apollo/client';
import { convertSurgeTokenToBUSD, convertTokenToBUSD, adjustDecimals, wrap, unwrap, formatStringWithCommas, isApprovalRequired, priceInToken } from "../core/Utils";
import { approveOld, allowance, MaxSafeInteger } from "../core/Utils";

export default function Farm() {
	const [tabValue, setTabValue] = useGlobalState('tabValue');
	const [swapCardType, setSwapCardType] = useGlobalState('swapCardType');
	const [cardType, setCardType] = useGlobalState('swapCardType');
	const [migrateDialogOpen, setMigrateDialogOpen] = React.useState(false);
	const [confirmUnstakeDialoOpen, setConfirmUnstakeDialoOpen] = React.useState(false);

	const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();

	const [xUSD_FARM_contract, set_xUSD_FARM_contract] = React.useState<Contract>()
	const [BNB_V1_FARM_contract, set_BNB_V1_FARM_contract] = React.useState<Contract>()
	const [userV1Balance, setUserV1Balance] = React.useState("");

	const { enqueueSnackbar, closeSnackbar } = useSnackbar();
	const [myBalance, setMyBalance] = React.useState("0");
	const [buyValue, setBuyValue] = React.useState(0);

	const [totalFarmsValue, setTotalFarmsValue] = useGlobalState('totalFarmsValue')
	const [totalRewards, setTotalRewards] = useGlobalState('totalRewards')
	const [rerun, setRerun] = useGlobalState('rerun');

	const [toggleByKey, setToggleByKey] = React.useState(null);
	const [depositedFarms, setDepositedFarms] = useGlobalState('depositedFarms');
	const [availableFarms, setAvailableFarms] = useGlobalState('availableFarms');

	const [userBalanceBNB, setUserBalanceBNB] = React.useState("0");

	const [unstakeSliderValue, setUnstakeSliderValue] = React.useState(0);
	const [canUnstake, setCanUnstake] = React.useState(false);

	const [BNBInput, setBNBInput] = React.useState('0')
	const [BNBsliderVal, setBNBsliderVal] = React.useState(0)

	const [LPInput, setLPInput] = React.useState(0)
	const [LPsliderVal, setLPsliderVal] = React.useState(0)

	const [allowanceRequired, setAllowanceRequired] = React.useState([]);

	const [isError, setError] = React.useState(false);

	const [generalTokenInfo, setGeneralTokenInfo] = useGlobalState('generalTokenInfo');
	const [swapTabLiquidityState, setSwapTabLiquidityState] = useGlobalState('liquidityTabState');

	const forceUpdate: () => void = React.useState()[1].bind(null, {})

	let timeInterval: any = 0;

	// let farm_manager_contract;
	const handleConfirmUnstakeDialog = (open: boolean) => {
		setConfirmUnstakeDialoOpen(open)
	}
	const unlockV1 = () => {
		BNB_V1_FARM_contract.unlockAll().then((receipt) => {
			const txlink = `https://bscscan.com/tx/${receipt.hash}`
			enqueueSnackbar((<Typography >unlock successful check at: <a rel="noreferrer" target="_blank" href={txlink}>{txlink}</a></Typography>), { variant: 'success' });
		}).catch((error) => {
			if (error.data) {
				enqueueSnackbar((<Typography >error for unlock: {error.data.message}</Typography>), { variant: 'error' });
			} else {
				enqueueSnackbar((<Typography >error for unlock: {error.message}</Typography>), { variant: 'error' });
			}
			console.error(error)
		}).finally(() => {
			setRerun(true);
		})
		// // // console.log("unlockV1")
	}
	const handleUnstakeSlider = (event: Event, newValue: number) => {
		setUnstakeSliderValue(newValue)
	}
	const executeUnstake = (farm) => {

		const farmTokens = unwrap(wrap(farm.userFarmTokenBalance, -18).mul(BigNumber.from(unstakeSliderValue.toString())).div(BigNumber.from('100')))
		const tokens = farmTokens.split(".")[0];
		// // // console.log('TOKENS: ', tokens, farm.userFarmTokenBalance, farmTokens);
		farm.farmContract.unstake(tokens)
			.then((receipt) => {
				const txlink = `https://bscscan.com/tx/${receipt.hash}`
				enqueueSnackbar((<Typography >transaction successful check at: <a rel="noreferrer" target="_blank" href={txlink}>{txlink}</a></Typography>), { variant: 'success' });
			}).catch((error) => {
				if (error.data) {
					enqueueSnackbar((<Typography >error for transaction: {error.data.message}</Typography>), { variant: 'error' });
				} else {
					enqueueSnackbar((<Typography >error for transaction: {error.message}</Typography>), { variant: 'error' });
				}
				console.error(error)
			}).finally(() => {
				setRerun(true);
			})

	}

	const executeClaim = (farmContract: Contract) => {
		farmContract.claimReward()
			.then((receipt) => {
				const txlink = `https://bscscan.com/tx/${receipt.hash}`
				enqueueSnackbar((<Typography >transaction successful check at: <a rel="noreferrer" target="_blank" href={txlink}>{txlink}</a></Typography>), { variant: 'success' });
			}).catch((error) => {
				if (error.data) {
					enqueueSnackbar((<Typography >error for transaction: {error.data.message}</Typography>), { variant: 'error' });
				} else {
					enqueueSnackbar((<Typography >error for transaction: {error.message}</Typography>), { variant: 'error' });
				}
				console.error(error)
			}).finally(() => {
				setRerun(true);
			})
	}

	const arrangeTimeLeft = (time) => {
		if (time <= 0 || time == undefined) return "0:00:00";

		let days: number = Math.floor(time / 86400)
		let hours: number = Math.floor((time - days * 86400) / 3600);
		let minutes: number = Math.floor((time - days * 86400 - hours * 3600) / 60);
		let seconds: number = time - days * 86400 - hours * 3600 - minutes * 60;

		let strHours = hours < 10 ? '0' + hours : hours;
		let strMins = minutes < 10 ? '0' + minutes : minutes;
		let strSecs = seconds < 10 ? '0' + seconds : seconds;

		let str = '';

		if (days > 0) str += days + 'd ';
		if (hours > 0) str += strHours + 'h ';
		if (minutes > 0) str += strMins + 'm ';
		if (seconds > 0) str += strSecs + 's ';

		return str;
	}

	const buildDay = (timeUntilUnlock, duration) => {
		const days = duration.days();
		const hours = duration.hours();
		const minutes = duration.minutes();
		const seconds = duration.seconds();

		let timeUnlockHumanReadable;

		if (timeUntilUnlock <= 0) {
			timeUnlockHumanReadable = '0:00:00';
		} else {
			if (days > 0) timeUnlockHumanReadable += `${days}d `
			if (hours > 0) timeUnlockHumanReadable += `${hours}h `
			if (minutes > 0) timeUnlockHumanReadable += `${minutes}m `
			if (seconds > 0) timeUnlockHumanReadable += `${seconds}s`

		}

		return timeUnlockHumanReadable;
	}

	const displayValueOfRewardsClaimedForUser = (farm) => {

		const first = parseFloat(farm.valueOfXUSDRewardForUser)
		const second = parseFloat(farm.valueOfPairingRewardForUser);
		const total = first + second;

		return (
			<Grid container>
				<Grid item xs={12}>
					<Typography textAlign="center" variant="h6" color='#fff' >Total Claimed</Typography>
					<Typography textAlign="center" variant="body1" color='#00dd00'>${formatStringWithCommas(total.toString(), 2)}</Typography>
				</Grid>
			</Grid>
		)

	}

	const buyFarmToken = (farm, withBNB: boolean) => {

		const decimals = 18
		if (withBNB) {
			const overrides = {
				from: account,
				//to: farm.farmContract.address,
				value: ethers.utils.parseUnits(`${BNBInput}`, decimals),
				gasLimit: 1300000
			}
			//library.getSigner().sendTransaction(txParams)
			farm.farmContract.farmWithBNB(overrides)
				.then((receipt) => {
					const txlink = `https://bscscan.com/tx/${receipt.hash}`
					enqueueSnackbar((<Typography >Success check tx at: <a rel="noreferrer" target="_blank" href={txlink}>{txlink}</a></Typography>), { variant: 'success' });

				}).catch((error) => {
					if (error.data) {
						enqueueSnackbar((<Typography >error for transaction: {error.data.message}</Typography>), { variant: 'error' });
					} else {
						enqueueSnackbar((<Typography >error for transaction: {error.message}</Typography>), { variant: 'error' });
					}
					console.error(error)
				}).finally(() => {
					setRerun(true);
				})
		} else {

			const stakeLPVal = unwrap(wrap(`${farm.LPTokenBalance}`, -18)).split(".")[0];
			farm.farmContract.deposit(stakeLPVal).then((receipt) => {
				const txlink = `https://bscscan.com/tx/${receipt.hash}`
				enqueueSnackbar((<Typography >Success check tx at: <a rel="noreferrer" target="_blank" href={txlink}>{txlink}</a></Typography>), { variant: 'success' });

			}).catch((error) => {
				if (error.data) {
					enqueueSnackbar((<Typography >error for transaction: {error.data.message}</Typography>), { variant: 'error' });
				} else {
					enqueueSnackbar((<Typography >error for transaction: {error.message}</Typography>), { variant: 'error' });
				}
				console.error(error)
			}).finally(() => {
				setRerun(true);
			})
		}
	}

	const executeReinvestRewards = (farm) => {
		farm.farmContract.reinvestEarnings().then((receipt) => {
			const txlink = `https://bscscan.com/tx/${receipt.hash}`
			enqueueSnackbar((<Typography >Success check tx at: <a rel="noreferrer" target="_blank" href={txlink}>{receipt.hash}</a></Typography>), { variant: 'success' });
			return true
		}).catch((error) => {
			enqueueSnackbar((<Typography >error for transaction: {error.message}</Typography>), { variant: 'error' });
			console.error(error)
			return false
		}).finally(() => {
			setRerun(true);
		})
		// // // console.log('Rewards Reinvested')
	}

	const displayUpgradeFarmButton = (index, farm, rewardString, pairing) => {
		if (true) { //(pairing == 'BNB' && parseFloat(userV1Balance) > 0) { // change true to if Old Farm Tokens Balance is > 0
			return (
				<Grid className="p-2 mb-4 max-w-lg mx-auto my-0" alignItems="center" justifyContent={{ xs: 'right', sm: 'center' }} xs={12}>
					<Stack spacing={14}>
						<Button className="w-6/12 mx-auto" variant="outlined" color="primary" onClick={() => { setMigrateDialogOpen(true) }}>Upgrade To New Farm</Button>
					</Stack>
				</Grid>
			)
		}
	}
	const confirmUnstakeDialog = (farm) => {
		return (
			<Dialog
				open={confirmUnstakeDialoOpen}
				onClose={() => { handleConfirmUnstakeDialog(false) }}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">
					{"Early Unstaking Confirmation"}
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						A {farm.earlyFee}% early unstake fee will be added if unstaked before the 7 day lock time.<br />
						The lock time will be over {farm.unstakeTime}.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => { handleConfirmUnstakeDialog(false) }}>Disagree</Button>
					<Button onClick={() => {
						executeUnstake(farm)
						handleConfirmUnstakeDialog(false)
					}}>
						Agree
					</Button>
				</DialogActions>
			</Dialog>
		)
	}

	const displayRightHalfTop = (index, farm, rewardString, pairing) => {
		if (farm.userFarmTokenBalance != 0) {
			return (
				<Grid item className="p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 md:mb-0 mb-4" alignItems="center" justifyContent={{ xs: 'left', sm: 'center' }} xs={12} sm={12} md={5.75}>
					<Stack spacing={6} >
						<Stack spacing={2} >
							<Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='1rem'>Staked Liquidity</Typography>
							<Grid container>
								<Grid item xs={12} sm={6} md={6}>
									<Typography textAlign="center" variant="h5" color='#fff' marginBottom='1rem'>{farm.name[1]}</Typography>
									<Typography textAlign="center" variant="body1" color='#fff' marginBottom='1rem'>{formatStringWithCommas(farm.amountOfUserXUSDInFarm, 4)}</Typography>
								</Grid>
								<Grid item xs={12} sm={6} md={6}>
									<Typography textAlign="center" variant="h5" color='#fff' marginBottom='1rem'>{farm.name[0]}</Typography>
									<Typography textAlign="center" variant="body1" color='#fff' marginBottom='1rem'>{formatStringWithCommas(farm.amountOfUserPairingInFarm, farm.pairedTokenDecimals)}</Typography>
								</Grid>
							</Grid>
							<FormControl>
								<Slider className="w-11/12 align-middle mx-auto block py-6"
									key={"slider-unstake"}
									aria-label="Temperature"
									value={unstakeSliderValue}
									onChange={handleUnstakeSlider}
									// onChangeCommitted={() => {
									// 	setBNBInput(userBalance * (BNBsliderVal / 100))
									// }}
									valueLabelDisplay="auto"
									step={1}
									marks
									min={0}
									max={100}
								/>
							</FormControl>

							<Grid container>
								<Grid item xs={12} sm={6} md={6}>
									<Grid item>
										<Typography textAlign="center" variant="body1" color='#fff' marginBottom='1rem'>{formatStringWithCommas((farm.amountOfUserXUSDInFarm * (unstakeSliderValue / 100)).toString(), 4)}</Typography>
									</Grid>
								</Grid>
								<Grid item xs={12} sm={6} md={6}>
									<Grid item>
										<Typography textAlign="center" variant="body1" color='#fff' marginBottom='1rem'>{formatStringWithCommas((farm.amountOfUserPairingInFarm * (unstakeSliderValue / 100)).toString(), farm.pairedTokenDecimals)} </Typography>
									</Grid>
								</Grid>
							</Grid>
							<Button variant="outlined" color="primary" disabled={(unstakeSliderValue === 0)} onClick={() => { farm.unstakeTimeBlocks <= 0 ? executeUnstake(farm) : handleConfirmUnstakeDialog(true) }} >Unstake</Button>
							{confirmUnstakeDialog(farm)}
						</Stack>
					</Stack>
				</Grid>
			)
		}
	}

	const handleBNBInputChange = (newValue: string) => {

		if (newValue === undefined || newValue === "") {
			setBNBInput('0')
			return;
		} else if (newValue === '') return;

		setBNBInput(newValue);

		// validate only one decimal point in string
		const numberOfDots = Array.from(newValue).reduce((total, char) => {
			total = (char == '.') ? total + 1 : 0;
			return total
		}, 0)
		if (numberOfDots > 1) {
			setError(true);
			return;
		}

		// if there is a letter anywhere, don't let them enter regex
		if (newValue.match(/[^\d.]/i)) {
			// // // console.log('letters in string')
			setError(true);
			return;
		}

		if (newValue === '' || parseFloat(newValue) === 0) {
			setError(true);
			return
		}

		if (!Number.isNaN(parseFloat(newValue))) {
			setError(false);
		}
	}

	const displayRightHalfBottom = (index, farm, rewardString, pairing) => {
		return (
			<Grid className="p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700" alignItems="center" justifyContent={{ xs: 'right', sm: 'center' }} xs={12} sm={12} md={5.75}>
				{renderBuyWithBNBTab(farm, parseFloat(userBalanceBNB).toFixed(4).toString(), pairing)}
			</Grid>
		)
	}

	const renderBuyWithBNBTab = (farm, userBalance, pairing) => {
		return (
			<Stack spacing={2} >
				<Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='1rem'>Farm Using BNB</Typography>
				<Grid xs={12} justifyContent="center">
					<Typography className="mb-1" textAlign='center' variant="body2" color='#ffffff'>Balance: {userBalance} BNB</Typography>
					<FormControl fullWidth>
						<TextField className="w-11/12 mx-auto"
							value={BNBInput}
							color={isError ? "error" : "info"}
							onChange={(e) => handleBNBInputChange(e.target.value)}
							inputProps={{
								style: {
									padding: 10
								}
							}} />
					</FormControl>
					<Slider className="w-11/12 align-middle mx-auto block py-6"
						key={"slider-buywithBNB"}
						aria-label="Temperature"
						valueLabelDisplay="auto"
						value={BNBsliderVal}
						onChange={(event: Event, newValue: number) => {
							setBNBsliderVal(newValue)

						}}
						onChangeCommitted={() => {
							setBNBInput((userBalance * (BNBsliderVal / 100)).toString())
						}}
						step={10}
						marks
						min={0}
						max={100}
					/>
				</Grid>
				<Button className="m-0" disabled={isError} variant="outlined" color="primary" onClick={() => { buyFarmToken(farm, true) }}>Buy Farm With BNB</Button>
			</Stack>
		)
	}

	const displayLeftHalfTop = (index, farm, rewardString, pairing) => {
		const canClaim = (parseFloat(farm.pendingBaseTokenRewards) + parseFloat(farm.pendingPairedTokenRewards)) > 0
		if (farm.userFarmTokenBalance != 0) {
			return (
				<Grid item className="max-h-full p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 md:mb-0 mb-4" alignItems="center" justifyContent={{ xs: 'left', sm: 'center' }} xs={12} sm={12} md={5.75}>
					<Stack className="h-full" spacing={6} >
						<Stack className="h-full" spacing={2} >
							<Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='1rem'>Pending Rewards</Typography>
							{renderFarmRewardsOutput(farm, pairing)}
							<Button className="mt-auto" variant="outlined" color="primary" disabled={!canClaim} onClick={() => { executeClaim(farm.farmContract) }} >Claim</Button>
							{pairing == 'BNB' ?
								<Button disabled={!canClaim} variant="outlined" color="primary"
									onClick={() => {
										executeReinvestRewards(farm);
									}}>Reinvest</Button>
								:
								<></>
							}
							{/* <Button variant="outlined" color="primary" onClick={() =>{// // console.log(farm)}} >Claim</Button> */}

							{displayValueOfRewardsClaimedForUser(farm)}

						</Stack>
					</Stack>
				</Grid>
			)
		}
	}

	const calculateDollarValue = (farm, pending, isXUSD) => {

		const value = isXUSD ?
			parseFloat(farm.valueOfXUSDInFarm) / parseFloat(farm.amountOfXUSDInFarm)
			:
			parseFloat(farm.valueOfPairingInFarm) / parseFloat(farm.amountOfPairingInFarm)

		return (value * pending).toFixed(2).toString();
	}

	const renderFarmRewardsOutput = (farm, pairing) => {
		if (pairing == 'BNB') {
			return (
				<Grid className="sm:mb-2" container>
					<Grid item xs={12}>
						<Typography textAlign="center" variant="h5" color='#fff' marginBottom='0.75rem'>{farm.name[0]}</Typography>
						<Typography textAlign="center" variant="body1" color='#fff'>{formatStringWithCommas(farm.pendingBaseTokenRewards, 4)}</Typography>
						<Typography textAlign="center" variant="body2" color='#00dd00'>(${formatStringWithCommas(calculateDollarValue(farm, farm.pendingBaseTokenRewards, false), 2)})</Typography>
					</Grid>
				</Grid>
			)
		} else {
			return (
				<Grid className="sm:mb-1" container>
					<Grid item xs={12} sm={6} md={6}>
						<Typography textAlign="center" variant="h5" color='#fff' marginBottom='0.75rem'>{farm.name[1]}</Typography>
						<Typography textAlign="center" variant="body1" color='#fff' marginBottom='0.2rem'>{formatStringWithCommas(farm.pendingBaseTokenRewards, 2)}</Typography>
						<Typography textAlign="center" variant="body2" color='#00ff00'>(${formatStringWithCommas(calculateDollarValue(farm, farm.pendingBaseTokenRewards, true), 2)})</Typography>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Typography textAlign="center" variant="h5" color='#fff' marginBottom='0.75rem'>{farm.name[0]}</Typography>
						<Typography textAlign="center" variant="body1" color='#fff' marginBottom='0.2rem'>{formatStringWithCommas(farm.pendingPairedTokenRewards, farm.pairedTokenDecimals)}</Typography>
						<Typography textAlign="center" variant="body2" color='#00ff00'>(${formatStringWithCommas(calculateDollarValue(farm, farm.pendingPairedTokenRewards, false), 2)})</Typography>
					</Grid>
				</Grid>
			)
		}
	}

	const displayButtonsForLeftHalfBottom = (farm, approvalNeeded: boolean) => {

		if (farm.LPTokenBalance <= 0) {

			return (
				<Button className="mt-auto" variant="outlined" color="primary"
					onClick={() => {
						const token = generalTokenInfo[farm.name[0]];

						const pairedToken = {
							contract: token.contract,
							symbol: token.symbol,
							decimals: token.decimals,
							userBalanceToken: parseFloat(token.quantity)
						}

						const newState = swapTabLiquidityState;
						newState.pairedToken = { ...pairedToken };
						setSwapTabLiquidityState({ ...newState })
						setSwapCardType(1)
						setTabValue(1)
					}}>Click To Get LP Tokens</Button>
			);

		} else {

			if (approvalNeeded) {
				return (
					<Grid xs={12} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
						<Button className="mt-0" variant="outlined" color="primary" onClick={() => {
							makeApproval(farm.LPTokenContract, farm.farmContract.address)
						}}>Enable LP Tokens</Button>
						<Button className="mt-0" variant="outlined" color="primary"
							disabled={true}
							onClick={() => {
								buyFarmToken(farm, false)
							}}>Start Farming</Button>
					</Grid>
				);
			} else {
				return (
					<Button className="mt-auto" variant="outlined" color="primary"
						disabled={approvalNeeded}
						onClick={() => {
							buyFarmToken(farm, false)
						}} >Start Farming</Button>
				);
			}


		}
	}

	const reload = async () => {
		setUserBalanceBNB((await getBNBbalance(account, library)).toString());
		setRerun(true);
	}

	const displayLeftHalfBottom = (index, farm, rewardString, pairing, approvalNeeded) => {
		return (
			<Grid className="max-h-full p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 md:mb-0 mb-4" alignItems="center" justifyContent={{ xs: 'left', sm: 'center' }} xs={12} sm={12} md={5.75}>
				<Stack className="h-full" spacing={6} >
					<Stack className="h-full" spacing={2} >
						<Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='1rem'>Farm Using LP Tokens</Typography>
						<Grid item xs={12} justifyContent="center">
							<Typography className="mb-1" textAlign='center' variant="body2" color='#ffffff'>LP Token Balance: {formatStringWithCommas(farm.LPTokenBalance, 8)}</Typography>
						</Grid>
						<Stack direction={"column"} justifyContent="flex-end">
							{displayButtonsForLeftHalfBottom(farm, approvalNeeded)}
						</Stack>
					</Stack>
				</Stack>
			</Grid>
		)
	}

	const makeApproval = (tokenContract, address) => {
		approveOld(tokenContract, address).then(isApproved => {
			if (isApproved) {
				enqueueSnackbar((<Typography >Approved</Typography>), { variant: 'success' });
			} else {
				enqueueSnackbar((<Typography >Approval Failed</Typography>), { variant: 'error' });
			}
		}).catch(error => {
			enqueueSnackbar((<Typography >Approval Failed</Typography>), { variant: 'error' });
		}).finally(() => {
			setRerun(true);
		})
	}

	// const isLegacyFarm = (farmName) => {
	// 	const legacyFarms = ['sUSELESS-xUSD', 'BNB-xUSD', 'sADA-xUSD', 'sBTC-xUSD']
	// 	return legacyFarms.includes(farmName);
	// }

	const displayFarmTab = (address, farm, index) => {
		farm = Object.keys(farm).length > 0 ? farm : undefined;
		if (!farm) {
			return (
				<Stack key={index}>
					<ListItemButton key={index}>
						<Typography variant="h6" color='#2299ff' marginBottom='1rem'>Loading</Typography>
					</ListItemButton>
					<Divider variant="middle" key={index * 10000} />
				</Stack>
			)
		}

		const farmUSDValueForUser = farm?.valueOfUserFarmTokens
		const totalLiquidity = farm?.totalLiquidityForFarm;
		const totalFarmRewards = farm?.totalFarmRewards
		//const rewardString = (farm?.pairedSymbol == 'BNB') ? `${farm?.baseSymbol}` : `${farm?.baseSymbol} + ${farm?.pairedSymbol}`
		const rewardString = (farm?.pairedSymbol == 'BNB') ? `BNB` : `${farm?.baseSymbol} + ${farm?.pairedSymbol}`
		const pairing = `${farm?.pairedSymbol}`
		const logoName = `${farm?.name[0]}_logo`
		const farmName = `${farm?.name[0]}-${farm?.name[1]}`
		const approvalNeeded = farm?.approvalNeeded;
		const isLegacy = farm?.is_legacy;
		// // console.log('farmUSDValueForUser', farmUSDValueForUser)
		// 0.61rem 0.1rem 0.61rem 1.61rem; bg-[#21bbb11a]






		return (
			<>{
				isLegacy && farmUSDValueForUser == 0.0 ? (<>	</>) :
					//isLegacyFarm.includes(farmName) && farmUSDValueForUser == 0.0 ? (<>	</>) :
					(<>
						{farm != undefined ? (
							<>
								<ListItemButton sx={{ backgroundColor: '#21bbb10d' }} key={parseFloat(address)}
									onClick={() => { setToggleByKey((toggleByKey == null || toggleByKey != address) ? address : null) }}>
									<Grid alignItems="center" key={address} container xs={12}>
										{/* <Grid alignItems="center" container item xs={1} id="avatar"> */}
										{/* <Avatar style={{ backgroundColor: 'black' }}>
						<img src="https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png" alt="xUSD" />
						</Avatar> */}
										{/* <Avatar className="sm:top-7 md:top-7 lg:top-7 xl:top-7 2xl:top-7 top-9" style={{backgroundColor: 'black', position: 'absolute', bottom: '32px', left: '-10px', zIndex: '-1'}}>
						<Image src={xusd_logo} alt="xUSD" />
						</Avatar> */}
										{/* <Grid> */}
										<Grid alignItems="center" item xs={6} sm={2} id="names">
											<Stack direction="row" justifyContent="center">
												<Avatar sx={{ width: 32, height: 32 }} style={{ backgroundColor: 'black' }}>
													<Image src={logos[logoName]} height={32} width={32} alt={logoName} />
												</Avatar>
												<Avatar sx={{ width: 32, height: 32 }} style={{ backgroundColor: 'black' }}>
													<Image src={logos['xUSD_logo']} height={32} width={32} alt={logoName} />
												</Avatar>
											</Stack>

											<Stack direction="row" justifyContent="center">
												{isLegacy && farmName == 'BNB-xUSD' ? (
													<Typography variant="subtitle1">BNB-xUSD (v1)</Typography>
												) : (
													<Typography variant="subtitle1">{farmName}</Typography>
												)}
											</Stack>



											{isLegacy ? (
												<Tooltip title="Farm has ended due to upcoming upgrade. Please unstake">
													<ErrorOutlineIcon className="pl-1" />
												</Tooltip>
											) : (<></>)}


											{/* <Typography className="pl-2" variant="h6">{`${farm?.name}`}</Typography> */}
										</Grid>

										<Grid alignItems="center" justifyContent={{ xs: 'right', sm: 'center' }} item xs={6} id="APR">
											<Stack alignItems="center">
												<Typography variant="h6">
													{
														isLegacy ? '--' : formatStringWithCommas(farm?.APR, 2).concat('%')
													}
												</Typography>
												<Typography variant="body2" style={{ fontStyle: 'italic' }}>Current APR</Typography>
											</Stack>
										</Grid>
										<Grid alignItems="center" container xs={12} sm={4} id="details">
											<Grid className="sm:pt-0 pt-2" container xs={6} sm={12}>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-left font-bold sm:font-normal" variant="body2">Reward</Typography></Grid>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-right" variant="body2">{isLegacy ? '---' : rewardString}</Typography></Grid>
											</Grid>
											<Grid className="sm:pt-0 pt-2" container xs={6} sm={12}>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-left font-bold sm:font-normal" variant="body2">Total Rewards</Typography></Grid>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-right" variant="body2">
													${
														formatStringWithCommas(totalFarmRewards, 2)
													}</Typography>
												</Grid>
											</Grid>
											<Grid className="sm:pt-0 pt-2" container xs={6} sm={12}>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-left font-bold sm:font-normal" variant="body2">Balance</Typography></Grid>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-right" variant="body2">${
													formatStringWithCommas(farmUSDValueForUser, 2)}</Typography></Grid>
											</Grid>
											<Grid className="sm:pt-0 pt-2" container xs={6} sm={12}>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-left font-bold sm:font-normal" variant="body2">TVL</Typography></Grid>
												<Grid item xs={12} sm={6}><Typography className="text-center sm:text-right" variant="body2">${
													formatStringWithCommas(totalLiquidity, 2)
												}</Typography></Grid>
											</Grid>
										</Grid>
									</Grid>
								</ListItemButton>
								<Collapse in={toggleByKey === address} timeout="auto" unmountOnExit>
									{/* {displayUpgradeFarmButton(address, farm, rewardString, pairing)} */}

									{isLegacy ? (

										<Grid className="md:mb-8 max-w-4xl mx-auto my-0" container xs={12} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
											{displayRightHalfTop(address, farm, rewardString, pairing)}
										</Grid>


									) : (

										<>
											<Grid className="md:mb-8 max-w-4xl mx-auto my-0" container xs={12} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
												{displayLeftHalfTop(address, farm, rewardString, pairing)}
												{displayRightHalfTop(address, farm, rewardString, pairing)}
											</Grid>
											<Grid className="max-w-4xl mx-auto my-0" container xs={12} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
												{displayLeftHalfBottom(address, farm, rewardString, pairing, approvalNeeded)}
												{displayRightHalfBottom(address, farm, rewardString, pairing)}
											</Grid>
										</>
									)}
								</Collapse>
							</>
						) : (<Typography>Loading</Typography>)}
					</>)}</>
		)
	}

	React.useEffect(() => {
		if (account && library) {
			const signer = library.getSigner()

			const v1Address = "0x579aaF9882A1941885fADa7A6243cEACf3037659"
			const v1Abi = '[{"inputs":[{"internalType":"address","name":"farmManager","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"numTokens","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"blockUnlocked","type":"uint256"}],"name":"Locked","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountClaimed","type":"uint256"}],"name":"RewardClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokensRedeemed","type":"uint256"}],"name":"Unlocked","type":"event"},{"inputs":[],"name":"FarmManager","outputs":[{"internalType":"contract IXUSDFarmManager","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"holder","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"calculateUserLPBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"claimRewardForUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"claimWaitTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountXUSD","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getLPShareForHolder","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getRedeemableValue","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getTimeUntilNextClaim","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getTimeUntilUnlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalQuantitiesInLP","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isTimeExempt","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lockTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"newTime","type":"uint256"}],"name":"setClaimWaitTime","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newManager","type":"address"}],"name":"setFarmManager","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newTime","type":"uint256"}],"name":"setLockTime","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"Contract","type":"address"},{"internalType":"bool","name":"exempt","type":"bool"}],"name":"setTimeExempt","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"nLPTokens","type":"uint256"}],"name":"stakeLP","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"totalRewardsClaimedForUser","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"unlock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unlockAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unstakeAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unstakeFor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"bnb","type":"bool"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]'

			const v1Contract = new Contract(v1Address, v1Abi, signer);
			set_BNB_V1_FARM_contract(v1Contract)

			v1Contract.balanceOf(account).then((bal => {
				setUserV1Balance(unwrap(wrap(bal, -18)));
			}))

			library.getBalance(account).then((balance) => {
				setUserBalanceBNB(parseFloat(ethers.utils.formatUnits(balance, 'ether')).toFixed(4));
			});

		}
	}, [account, library])

	React.useEffect(() => {
		setRerun(true)
		// eslint-disable-next-line react-hooks/exhaustive-deps		
	}, [])
	React.useEffect(() => {

		setTimeout(() => {
			forceUpdate();
		}, 10000)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rerun])


		return (
			<Box>
				{account && library ? (

					<Box>
						<Dialog open={migrateDialogOpen} maxWidth="xs" fullWidth className="text-center">
							<Box style={{ border: '4px solid #272727' }}>
								<DialogTitle className="text-center" style={{ backgroundColor: '#272727', color: 'rgb(33 187 177)', fontWeight: 'bold' }}>
									Upgrade BNB Farm From V1 To V2
								</DialogTitle>
								<DialogContent className="text-left border" style={{ paddingLeft: '10px', paddingRight: '10px', borderColor: '#272727', backgroundColor: '#121212b3' }}>
									<Box style={{ textAlign: "center" }}>
										<Typography variant="body1" align="center" style={{ marginTop: '1rem' }}>
											Unlock Your LP Tokens From The V1 Farm<br />
										</Typography>
										<Typography variant="body2" align="center" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
											Lock The LP Tokens You Receive On The Farm Page<br />
										</Typography>
										<Button variant="outlined" color="primary" onClick={() => { unlockV1() }}>Unlock V1 Tokens</Button>
									</Box>
								</DialogContent>
							</Box>
							<Button variant="outlined" color="primary" onClick={() => { setMigrateDialogOpen(false) }}>
								Close
							</Button>
						</Dialog>
						{/* <div style={{ textAlign: 'center' }}>
							<Typography variant="h4" color='#21bbb1' fontWeight='bold'>
								Yield Farms
							</Typography>
						</div> */}
						<Stack spacing={2} direction="row" justifyContent="space-around">
							<div style={{ textAlign: 'center' }}>
								<Typography variant="h6" color='#2299ff'>
									Total Rewards
								</Typography>
								<Typography variant="subtitle1" color='#00dd00'>
									${
										formatStringWithCommas(totalRewards, 2)
									}
								</Typography>
							</div>
							<div style={{ textAlign: 'center' }}>
								<Typography variant="h6" color='#2299ff'>
									Total Value Locked
								</Typography>
								<Typography variant="subtitle1" color='#00dd00'>
									${
										formatStringWithCommas(totalFarmsValue, 2)
									}
								</Typography>
							</div>
						</Stack>
						{Object.entries(depositedFarms).length > 0 ? (
							<Stack className="mb-4 mt-4" id="deposited-farms" spacing={2}>
								<Typography variant="h6" color='#21bbb1'>
									Deposited Farms
								</Typography>

								{
									Object.entries(depositedFarms).map((item, index, arr) => (
										displayFarmTab(item[0], item[1], index)
									))
								}
							</Stack>
						) : (<></>)}

						{/* <Divider variant="middle" /> */}
						{Object.entries(availableFarms).length > 0 ? (
							<Stack className="mt-8" id="available-farms" spacing={2}>
								<Typography variant="h6" color='#21bbb1'>
									Available Farms
								</Typography>
								{
									Object.entries(availableFarms).map((item, index, arr) => (
										displayFarmTab(item[0], item[1], index)
									))
								}
							</Stack>
						) : (<></>)}

					</Box>
				) : (
					<Typography variant="h6" gutterBottom>
						Please connect your wallet
					</Typography>
				)}
			</Box>
		);



}

function signer(farm: any, signer: any) {
	throw new Error("Function not implemented.");
}

