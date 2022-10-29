import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, BigNumber } from "ethers";
import React from "react";
import { useGlobalState } from "../core/StateManager";
import { BNB, WIN, cake_loan_oracle, cake_loan, treasury, strategy, xUSDV2 } from "../wallet/Contracts";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ScoreIcon from '@mui/icons-material/Score';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import {
    Box, Card, Tab, Tabs, CardContent, Toolbar, Stack, Typography, Divider, Grid, TextField,
    Select, MenuItem, SelectChangeEvent, Button, Slider, CircularProgress, Input
} from "@mui/material";
import { useSnackbar } from 'notistack';
import Link from 'next/link';
// import { formatStringWithCommas, adjustDecimals, MaxSafeInteger, wrap, priceOf } from "../core/Utils";
import { convertSecondsIntoReadableTimeString } from "../helpers/timeConversions";
import HelpOutline from "@mui/icons-material/HelpOutline";
import LaunchIcon from '@mui/icons-material/Launch';
export default function WinPage() {
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();
    const [rerun, setRerun] = useGlobalState('rerun');
    const [isLoading, setIsLoading] = React.useState(false);

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
		
    const [isApproved, setIsApproved] = React.useState(false);
		
    const [XUSDBalanceOfUser, setXUSDBalanceOfUser] = React.useState<string>('0');
    const [ticketsToBuy, setTicketsToBuy] = React.useState<string>('0');

    const [timeUntilNewLotto, setTimeUntilNewLotto] = React.useState('0');
    const [pricePool, setPricePool] = React.useState('0');
    //const [odds, setOdds] = React.useState<{raw: string[], calculated: string}>({raw: [], calculated: "0"});	
    const [odds, setOdds] = React.useState<string[]>([]);
    const [ticketPrice, setTicketPrice] = React.useState<string>('1');
    const [totalTicketCost, setTotalTicketCost] = React.useState<Number>(0);
    const [maxTickets, setMaxTickets] = React.useState<Number>(0);
    const [currentGame, setCurrentGame] = React.useState<Number>(0);
    const [history, setHistory] = React.useState<({winners: string[], amounts: string[]})>({winners: [], amounts: []});
    const [xusdPrice, setXUSDPrice] = React.useState<string>('0');
    const [totalXUSDBurned, setTotalXUSDBurned] = React.useState<string>('0');
    const [totalXUSDWon, setTotalXUSDWon] = React.useState<string>('0');
    const [burnPercent, setBurnPercent] = React.useState<number>(0);
    const [resourcePercent, setResourcePercent] = React.useState<number>(0);

    const isValidNumber = (value: string) => {
        const regex = /^\d+\.?\d*$/;
        return regex.test(value);
      };

    const fetchXUSDReads = async () => {
        const contract = new Contract(xUSDV2.address, xUSDV2.abi, library.getSigner());

        // XUSD Balance Of User
        const balance = await contract.balanceOf(account);

        // XUSD Price In USD
        const price = await contract.calculatePrice();

        // Allowance Of WIN For User
        const allowance = await contract.allowance(account, WIN.address);

        // Return Data
        return {
            userBalance: parseFloat(ethers.utils.formatEther(balance)).toFixed(2),
            price: Number(ethers.utils.formatEther(price)).toFixed(2),
            approvalStatus: allowance.gte(balance) || balance.eq(BigNumber.from('0'))
        }
    }


    const fetchWinReads = async () => {
        const winContract = new Contract(WIN.address, WIN.abi, library.getSigner());

        // totals
        const totalRewarded = await winContract.totalRewarded();
        const totalBurned = await winContract.totalBurned();
        const totalResources = await winContract.totalGivenToResources();

        // ticket info
        const price = await winContract.currentTicketCost();

        // odds
        const _oddsVal = await winContract.getOdds(account);
        const _odds = _oddsVal.toString().split(',');
        const odd = ((Number(odds[0]) / (Number(odds[1]))) * (100 - Number(odds[2]))).toFixed(2);

        // percents
        const _burnPercent = await winContract.burnPercentage();
        const _resourcePercent = await winContract.resourcePercentage();

        // history and game info
        const currentGameID = await winContract.currentLottoID();
        const pastWinners = await winContract.getPastWinnersAndAmounts(3);

        // prize pool
        const xusdToWin = await winContract.amountToWin();

        // time remaining
        const timeLeft = await winContract.timeUntilNewLotto();

        // Return Data
        return {
            _totalXUSDRewarded: ethers.utils.formatUnits(totalRewarded, 18),
            _totalXUSDBurned: ethers.utils.formatUnits(totalBurned.add(totalResources), 18),
            _ticketPrice: parseFloat(ethers.utils.formatEther(price)).toFixed(2),
            odds: _odds,
            _burnPercent: Number(_burnPercent.toString()),
            _resourcePercent: Number(_resourcePercent.toString()),
            gameID: Number(currentGameID),
            winsAndAmounts: pastWinners,
            xusdToWin: parseFloat(ethers.utils.formatEther(xusdToWin)).toFixed(2),
            timeLeft: timeLeft.toString()
        }
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.target.value;
        if (isValidNumber(val)) {
            const value = Number(val);
            setTicketsToBuy(((value > maxTickets) ? maxTickets : value).toString());
            setTotalTicketCost(Number((value > maxTickets) ? maxTickets : value) * parseFloat(ticketPrice));
        } else {
            setTicketsToBuy('0');
            setTotalTicketCost(0);
        }
    }

    const calculateOdds = () => {
        if (odds.length > 0) {
            return ((Number(odds[0]) / (Number(odds[1]))) * (100 - Number(odds[2]))).toFixed(2);
        } else {
            return '0';
        }
    }

    const getValues = async () => {
			let [
                xusdStats,
				gameStats
			] = await Promise.all([
                fetchXUSDReads(),
                fetchWinReads()
			])

			setIsApproved(xusdStats.approvalStatus);
			setXUSDBalanceOfUser(xusdStats.userBalance);
			setTimeUntilNewLotto(gameStats.timeLeft)
			setPricePool(gameStats.xusdToWin)
			setOdds(gameStats.odds)
			setTicketPrice(gameStats._ticketPrice)
			setMaxTickets(Math.floor(parseFloat(xusdStats.userBalance) / parseFloat(ticketPrice)))
            setXUSDPrice(xusdStats.price);
            setCurrentGame(gameStats.gameID - 5);

            const winner0 = gameStats.winsAndAmounts[0][0].toString();
            const winner1 = gameStats.winsAndAmounts[0][1].toString();
            const winner2 = gameStats.winsAndAmounts[0][2].toString();

            const amount0 = ethers.utils.formatUnits(gameStats.winsAndAmounts[1][0], 18);
            const amount1 = ethers.utils.formatUnits(gameStats.winsAndAmounts[1][1], 18);
            const amount2 = ethers.utils.formatUnits(gameStats.winsAndAmounts[1][2], 18);

            setHistory({
                winners: [winner0, winner1, winner2],
                amounts: [amount0, amount1, amount2]
            });
            
            setTotalXUSDWon(parseFloat(gameStats._totalXUSDRewarded).toFixed(2));
            setTotalXUSDBurned(parseFloat(gameStats._totalXUSDBurned).toFixed(2));

            setBurnPercent(gameStats._burnPercent);
            setResourcePercent(gameStats._resourcePercent);
    }

    const approveContract = async () => {
			const contract = new Contract(xUSDV2.address, xUSDV2.abi, library.getSigner());
			const tx = await contract.approve(WIN.address, ethers.constants.MaxUint256);
			setIsLoading(true);
			const reciept = await tx.wait();
			setIsLoading(false);
			if (reciept.status === 1) {
					enqueueSnackbar('Approved!', { variant: 'success' });
					setIsApproved(true);
			} else {
					enqueueSnackbar('Something happened, try again', { variant: 'error' });
			}
    }

		const buyTickets = async () => {
			const winContract = new Contract(WIN.address, WIN.abi, library.getSigner());
			const tx = await winContract.getTickets(ticketsToBuy);
			setIsLoading(true);
			const reciept = await tx.wait();
			setIsLoading(false);
			if (reciept.status === 1) {

					enqueueSnackbar('Bought tickets!', { variant: 'success' });
					setRerun(!rerun);
			} else {
					enqueueSnackbar('Something happened, try again', { variant: 'error' });
			}
		}

		const handleBuyTickets = () => {
			if (isApproved || Number(ticketsToBuy) > 0 || totalTicketCost < parseFloat(XUSDBalanceOfUser)) {
				console.debug("able to buy tickets");
				buyTickets();
			}
		}

        const getCost = () => {
            if (Number(ticketsToBuy) === 0 ) {
                return 'Ticket Cost: ' + ticketPrice + ' XUSD';
            } else {
                return 'Cost: ' + totalTicketCost + ' XUSD';
            }
        }

        // const ticketUSDValue = () => {
        //     if (xusdPrice === '0' || ticketPrice === '0') {
        //         return '1';
        //     } else {
        //         return (parseFloat(ticketPrice) * parseFloat(xusdPrice)).toFixed(2);
        //     }
        // }

        const potValue = () => {
            if (xusdPrice === '0' || pricePool === '0') {
                return '$0';
            } else {
                return ethers.utils.commify((parseFloat(xusdPrice) * parseFloat(pricePool)).toFixed(2))
            }
        }

        const winnerValue = (winAmount) => {
            if (xusdPrice === '0' || winAmount === '0' || winAmount === '') {
                return '$0';
            } else {
                return ethers.utils.commify((parseFloat(xusdPrice) * parseFloat(winAmount)).toFixed(2))
            }
        }

        const displayOdds = () => {
            if (odds[1] == '0') {
                return '0 / 0 (0%)'
            } else {
                return odds[0] + ' / ' + odds[1] + ' (' + calculateOdds() + '%)'
            }
        }

        const getWinner = (num: number) => {
            if (history && history.winners[num]) {
                if (history.winners[num] === ethers.constants.AddressZero) {
                    return 'BURNED';
                } else {
                    return history.winners[num].substring(0, 5) + '...' + history.winners[num].substring(38, 42);
                }
            } else {
                return '-----';
            }
        }

        const getAmount = (num: number) => {
            if (history && history.amounts[num]) {
                return parseFloat(history.amounts[num]).toFixed(2)
            } else {
                return '-----';
            }
        }

    React.useEffect(() => {
        if (library && account) {
            getValues();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [library, rerun]);

    const renderTab = () => {
        return (  
            <>
                <section className="bg-gradient-to-t from-brand-2/25 via-brand-2/5 to-transparent bg-white -m-4 text-brand-2 p-4 ">
                    <h1 className="flex flex-col md:flex-row items-center justify-center text-4xl xs:text-5xl md:text-6xl mt-16 leading-none"><span className="font-black text-brand-1 tracking-tight mr-1 flex items-center"><LocalFireDepartmentIcon className="h-10 w-10 mr-1" />Burn To Win</span><span className="px-4 hidden md:inline-flex font-semibold">|</span>Game<span className="font-semibold ml-2">{currentGame}</span></h1>
                    <p className="text-center text-base xs:text-xl md:text-2xl mb-16 mt-4 md:mt-1 font-bold border-t md:border-t-0 border-brand-2/25 pt-4 md:pt-0"> Burn XUSD for a chance to win the prize pool</p>
                </section>   
                <section className="my-16">
                    <h1 className="text-center text-3xl xs:text-4xl md:text-5xl flex items-center justify-center mb-8"><ScoreIcon className="h-6 w-6 mr-1" /> Game <span className="font-bold text-brand-1 tracking-tight ml-1">Stats</span></h1>
                    <div className="flex flex-col md:flex-row md:items-center justify-center md:space-x-4 space-y-4 md:space-y-0">
                        <div className="bg-gradient-to-t from-brand-2/25 via-brand-2/5 to-transparent bg-white border-4 border-brand-2 rounded-md text-brand-2 flex flex-col items-center p-8 shadow-xl shadow-brand-1/10">
                            <div className="font-bold underline underline-offset-4 decoration-dotted decoration-brand-1 text-xl">Prize Pool</div>
                            <div>{pricePool} XUSD (${potValue()})</div>
                        </div>
                        <div className="bg-gradient-to-t from-brand-2/25 via-brand-2/5 to-transparent bg-white border-4 border-brand-2 rounded-md text-brand-2 flex flex-col items-center p-8 shadow-xl shadow-brand-1/10">
                            <div className="font-bold underline underline-offset-4 decoration-dotted decoration-brand-1 text-xl">Time Left In Game</div>
                            <div>{convertSecondsIntoReadableTimeString(Number(timeUntilNewLotto))}</div>
                        </div>
                        <div className="bg-gradient-to-t from-brand-2/25 via-brand-2/5 to-transparent bg-white border-4 border-brand-2 rounded-md text-brand-2 flex flex-col items-center p-8 shadow-xl shadow-brand-1/10">
                            <div className="font-bold underline underline-offset-4 decoration-dotted decoration-brand-1 text-xl">Your odds</div>
                            <div>{displayOdds()}</div>
                        </div>
                    </div>
                </section>
                <section className="bg-brand-2 -mx-4 py-8 md:py-16 px-4">
                    <h1 className="text-center text-3xl xs:text-4xl md:text-5xl leading-none flex items-center justify-center"><ConfirmationNumberIcon className="h-6 w-6 mr-1" />Get<span className="font-bold text-brand-1 tracking-tight ml-1">Tickets</span></h1>
                    <div className="flex flex-col md:flex-row md:items-center justify-center mt-8">
                        <div className="max-w-full md:max-w-sm bg-brand-5 text-brand-2 p-4 md:p-8 rounded-md">
                            <div className="text-xl mb-2 font-bold flex items-center underline underline-offset-4 decoration-dotted decoration-brand-1"><HelpOutline className="h-5 w-5 mr-1 text-brand-1" />How It works:</div>
                            <div>
                                <ol className="list-decimal list-outside space-y-2 ml-8">
                                    <li className="list-item">Every 7 Days A New Game Begins</li>
                                    <li className="list-item">The Prize Pool Is Fed From XUSD Utilities</li>
                                    <li className="list-item">{100 - (burnPercent + resourcePercent)}% Of Ticket Cost Is Added To The Prize Pool - {burnPercent}% Is Burned, {resourcePercent}% Goes Back To XUSD Utilities</li>
                                    <li className="list-item">There Is A {odds[2]}% Chance Nobody Wins And The Prize Pool Is BURNED</li>
                                    <li className="list-item">Tickets Start At 1 XUSD Each Game But Increase By 0.10 XUSD Each Day</li>
                                </ol>
                            </div>
                            </div>
                        <div>
                            <div className="bg-brand-3 p-4 md:p-8 md:ml-8 rounded-lg md:max-w-sm mt-4 md:mt-0">
                                <div>
                                    <div className="text-xl md:text-2xl">You Have: {odds[0]} Tickets</div>
                                    <div className="text-base md:text-xl mt-1">You Have: {XUSDBalanceOfUser} XUSD</div>
                                    {/* <div>You Can Get: {maxTickets} More Tickets</div> */}
                                    <div className="my-6">
                                        <Input value={ticketsToBuy} onChange={handleInputChange} fullWidth />
                                    </div>
                                    { isApproved ? (
                                        <Button onClick={handleBuyTickets} variant="outlined" color="primary" size="large">
                                            {getCost()}
                                        </Button>) : (
                                        <Button onClick={approveContract} variant="outlined" color="primary" size="large">
                                            Approve
                                            {isLoading ? (<CircularProgress className="relative left-2" style={{ height: '24px', width: '24px' }} />) : ''}
                                        </Button>)
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="mb-16">
                    <h1 className="flex flex-col md:flex-row items-center justify-center text-4xl xs:text-5xl md:text-6xl leading-none">Totals</h1>
                    <div className="flex flex-col md:flex-row items-stretch justify-center md:space-x-4 space-y-4 md:space-y-0 mt-6">
                        <div className="bg-white text-brand-2 p-8 rounded-md flex flex-col items-center">
                            <div className="font-bold text-2xl">Total Won</div>
                            <div className="text-xl">{totalXUSDWon} XUSD</div>
                            <div className="text-sm">(${winnerValue(totalXUSDWon)})</div>
                        </div>
                        <div className="bg-white text-brand-2 p-8 rounded-md flex flex-col items-center">
                            <div className="font-bold text-2xl">Total Burned</div>
                            <div className="text-xl">{totalXUSDBurned} XUSD</div>
                            <div className="text-sm">(${winnerValue(totalXUSDBurned)})</div>
                            
                        </div>
                    </div>
                </section>
                <section  className="bg-brand-5 -m-4 -mb-6 text-brand-2 ">
                    <p className="flex items-center justify-center mt-8 text-4xl xs:text-5xl md:text-6xl leading-none font-bold">Winners Table</p>
                    <div className="flex items-center justify-center p-8">
                        <div className="space-y-4">
                            {history.winners.map((winner, index) => 
                                <>
                                    <div className="flex items-center justify-between space-x-14 text-xl border-b border-dashed border-brand-1">
                                        <div className="flex items-center"><Link href={`https://bscscan.com/address/${winner}`}><a className="flex items-center">{getWinner(index)}{getWinner(index) !== "BURNED" ? <LaunchIcon className="h-4 w-4" /> : null}</a></Link></div>
                                        <div className="font-bold flex items-center">{getAmount(index)} XUSD</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                
                </section> 
            </>
        )
    }

    return (
        <Box className='flex justify-center'>
            {account && library ? (
                <>
                    {/* <Card sx={{ maxWidth: '42rem', margin: '0 auto' }}> */}
                    <Card className='w-full'>
                        <CardContent>
                            <Stack spacing={3}>
                                {renderTab()}
                            </Stack>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Typography variant="h6" gutterBottom>
                    Please connect your wallet
                </Typography>
            )}
        </Box>
    );
}