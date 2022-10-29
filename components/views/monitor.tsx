// monitor tab shows the crypto that you own in a list view
import * as React from 'react';
import Table from '@mui/material/Table';
import { TableBody, TableCell, TableContainer, TableHead, TableFooter, TableRow, Paper, Button, Tooltip, IconButton, Switch, FormControlLabel, CircularProgress, Grid, Collapse, Menu, MenuItem, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Box, Card, CardContent, Typography, Container } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ethers } from "ethers";
import { BigNumber } from '@ethersproject/bignumber';

import { useWeb3React } from '@web3-react/core';
import { useService, useIsMobile, useWindowSize } from '../core/Service';
import { AddToMetamask } from '../ui/AddToMetamask';
import moment from 'moment';

import { useGlobalState, setGlobalState, getGlobalState } from '../core/StateManager';
import { formatStringWithCommas } from '../core/Utils';

import MigrateXUSD from "../ui/migrateXUSD";
import MigrateXUSDBNBFarm from "../ui/migrateXUSDBNBFarm";
import { xUSDV1_BNB_Farm } from '../wallet/Contracts';



export default function BasicTable() {
  const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();

  const [generalTokenInfo, setGeneralTokenInfo] = useGlobalState('generalTokenInfo');
  const [depositedFarms, setDepositedFarms] = useGlobalState('depositedFarms');
  const [availableFarms, setAvailableFarms] = useGlobalState('availableFarms');
  const [poolTotal, setPoolTotal] = useGlobalState('poolTotal');
  const [pools, setPools] = useGlobalState('pools');
  const [windowSize, setWindowSize] = useGlobalState('windowSize');
  const [isMobile, setIsMobile] = React.useState(false);
  const [filterMenuAnchor, setFilterMenuAnchor] = React.useState(null);
  const [fetchedGeneralInfo, setFetchedGeneralInfo] = React.useState(false);
  const [calculateValueAfterTax, setCalculateValueAfterTax] = React.useState(false);
  const [loader, setLoader] = React.useState(true);
  const [calculateValueAfterTaxLabel, setCalculateValueAfterTaxLabel] = React.useState("Show After Tax");
  const [showAPY, setShowAPY] = React.useState(false);
  const [tabValue, setTabValue] = useGlobalState('tabValue');
  const [tokenRows, setTokenRows] = React.useState([]);
  const [farmRows, setFarmRows] = React.useState([]);
  const [poolRows, setPoolRows] = React.useState([]);
  const [tokenTotal, setTokenTotal] = React.useState(0);
  const [farmTotal, setFarmTotal] = React.useState(0);
  // const [poolTotal, setPoolTotal] = React.useState(0);
  const [aggregateTotal, setAggregateTotal] = React.useState(0);
  const [rerun, setRerun] = useGlobalState('rerun');
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [isFarmDialogOpen, setFarmDialogOpen] = React.useState(false);
  const [hasFarmSteps, setHasFarmSteps] = React.useState(false);



  const handleDialogOpen = () => {
    setDialogOpen(true)
  };

  const handleDialogClose = () => {
    setDialogOpen(false)
  };

  const handleFarmDialogOpen = () => {
    setFarmDialogOpen(true)
  };

  const handleFarmDialogClose = () => {
    setFarmDialogOpen(false)
  };

  const checkFarmSteps = (fsteps) => {
    //// // console.log("checkFarmSteps", fsteps);
    if (fsteps.length === 0) {
      setHasFarmSteps(false);
    } else {
      setHasFarmSteps(true);
    }
  }


  const initialValue = (symbol) => {

    switch (symbol) {
      case 'sETH': return 0.0000000000053;
      case 'sBTC': return 0.000000000000346042;
      case 'xUSD': return 1.00;
      case 'xUSD (v1)': return 1.00;
      case 'sADA': return 0.000000006907128715;
      case 'sUSELESS': return 0.396594041;
      case 'SUSE': return 1.00;
      case 'sUSD': return 0.000000017587942;
      default: return -1;
    }

  }

  const startingDate = (symbol) => {

    switch (symbol) {                                       // 'YYYY-MM-DD'
      case 'sUSD': return new Date(2021, 7, 4);        // '2021-08-04'
      case 'sETH': return new Date(2021, 7, 11);       // '2021-08-11'
      case 'sBTC': return new Date(2021, 8, 12);       // '2021-09-12'
      case 'xUSD': return new Date(2021, 10, 8);       // '2021-11-08'
      case 'xUSD (v1)': return new Date(2021, 10, 8);       // '2021-11-08'
      case 'sADA': return new Date(2021, 8, 19);       // '2021-09-19'
      case 'sUSELESS': return new Date(2021, 9, 2);        // '2021-10-02'
      case 'SUSE': return new Date(2022, 3, 7);        // '2022-04-07'
      default: return new Date(2021, 7, 1);        // '2021-08-01'
    }

  }



  const calculateAPR_APY = (price, symbol, buy_fee, sell_fee) => {
    const startDate = startingDate(symbol);

    // get the number of days since the start date
    const daysSinceStart = moment().diff(startDate, 'days');
    const total = fetchTotalGain(price, symbol);

    const rate = total / daysSinceStart;

    const combined_fees = buy_fee + sell_fee;

    return {
      APR: (rate * 365),
      APY: (100 * (Math.pow((1 + (rate / 100)), 365) - 1))
    };
    /*
    A = B*(1 + r)^nt
    Expected Balance = Balance * (1 + rate)^(number_of_compounds_per_unit_time * time)
    */
  }
  const fetchTotalGain = (price, symbol) => {

    const init = initialValue(symbol);
    if (init == -1 || price == undefined) return 100;

    return 100 * (parseFloat(price) / init - 1);

  }


  const getTokenTotal = (lineInfo) => {
    setTokenTotal(lineInfo.reduce((acc, cur) => {
      return acc + parseFloat(cur['value_in_BUSD']);
    }, 0));
  }

  const getFarmTotal = (lineInfo) => {
    setFarmTotal(lineInfo.reduce((acc, cur) => {
      return acc + parseFloat(cur['value_in_BUSD']);
    }, 0));
  }
  
  // const getPoolTotal = () => {
  //   console.debug("getPoolTotal", pools);
  //   console.debug("pool 0", pools[0]?.poolBalanceOfUser.USD);
  //   console.debug("pool 1", pools[1]?.poolBalanceOfUser.USD);
  //   setPoolTotal(parseFloat(pools[0]?.poolBalanceOfUser.USD) + parseFloat(pools[1]?.poolBalanceOfUser.USD))
  // }

  const getTokenLineInfo = () => {
    return Object.values<any>(generalTokenInfo).filter(token => token.isSurged).map<any>(async token => {
      const token_quantity = `${token.quantity}`;
      // console.log('token_quantity', token_quantity, token.name);
      // console.log('token.valueInBUSD', token.valueInBUSD, token.name);
      let valueInBNB = parseFloat(token_quantity) * parseFloat(token.valueInBNB);
      let valueInBUSD = parseFloat(token_quantity) * parseFloat(token.valueInBUSD);
      let valueInUnderlying = parseFloat(token.totalValueInUnderlying);
      let buyFee = token.feeStruct['buyFee'] / 100
      let sellFee = token.feeStruct['sellFee'] / 100

      if (calculateValueAfterTax === true) {
        valueInBNB = valueInBNB * (1 - sellFee);
        valueInBUSD = valueInBUSD * (1 - sellFee);
        valueInUnderlying = valueInUnderlying * (1 - sellFee);
      }

      let tName;
      let tSymbol;
      const v1Address = '0x254246331cacbC0b2ea12bEF6632E4C6075f60e2';

      if (token.contract.address.toLowerCase() == v1Address.toLowerCase()) {
        tName = 'xUSD (v1)';
        tSymbol = 'xUSD (v1)';
      } else {
        tName = token.name;
        tSymbol = token.symbol;
      }

      const result = {
        name: tName,
        symbol: tSymbol,
        address: token.contract.address,
        decimals: token.decimals,
        quantity: parseFloat(token_quantity),
        value_underlying: valueInUnderlying,
        underlying_symbol: token.underlyingSymbol,
        underlying_decimals: token.underlyingDecimals,
        value_in_BNB: valueInBNB.toFixed(6),
        value_in_BUSD: valueInBUSD,
        price_in_underlying: token.priceInUnderlying,
        sell_fee: sellFee,
        buy_fee: buyFee
      }
      return result
    })
  }

  const getFarmLineInfo = () => {
    return Object.values<any>(depositedFarms).map(async farm => {
      console.info('farm', farm)
      const farmName = `${farm.name[0].toUpperCase()}-${farm.name[1].toUpperCase()}`;
      const decimals = await farm.farmContract.decimals()
      // const token_quantity = `${token.quantity}`;

      // let valueInBNB = parseFloat(token_quantity) * parseFloat(token.valueInBNB);
      // let valueInBUSD = parseFloat(token_quantity) * parseFloat(token.valueInBUSD);
      // let valueInUnderlying = parseFloat(token.totalValueInUnderlying);
      // let buyFee = token.feeStruct['buyFee'] / 100
      // let sellFee = token.feeStruct['sellFee'] / 100

      // if (calculateValueAfterTax === true) {
      //   valueInBNB = valueInBNB * (1 - sellFee);
      //   valueInBUSD = valueInBUSD * (1 - sellFee);
      //   valueInUnderlying = valueInUnderlying * (1 - sellFee);
      // }


      const result = {
        name: farmName,
        baseTokenSymbol: farm.name[1].toUpperCase(),
        pairedTokenSymbol: farm.name[0].toUpperCase(),
        address: farm.farmContract.address,
        decimals: decimals,
        pendingRewards: {
          baseToken: farm.pendingBaseTokenRewards,
          pairedToken: farm.pendingPairedTokenRewards
        },
        quantity: parseFloat(farm.userFarmTokenBalance),
        value_in_BUSD: parseFloat(farm.valueOfUserFarmTokens),
        isLegacy: farm.is_legacy
      }
      return result
    })
  }

  const populateTokenRows = () => {
    Promise.all(getTokenLineInfo()).then(lineInfo => {
      setTokenRows(lineInfo);
      getTokenTotal(lineInfo);
    });
  }

  const populateFarmRows = () => {
    Promise.all(getFarmLineInfo()).then(lineInfo => {

      const farmName = (farm) => {
        return `${farm.name[0].toUpperCase()}-${farm.name[1].toUpperCase()}`;
      }
      // console.log('lineInfo', lineInfo)


      // console.log('hasfarmsteap', hasFarmSteps)
      // console.log('findIndex', lineInfo.findIndex(farm => farm.address === xUSDV1_BNB_Farm.address))
      if (hasFarmSteps && lineInfo.findIndex(farm => farm.address === xUSDV1_BNB_Farm.address) === -1) {
        // console.log('we found it')
        // console.log('availableFarms', availableFarms)
        let xusdbnbfarm = availableFarms[xUSDV1_BNB_Farm.address] //Object.values<any>(availableFarms).find(farm => farm.address === xUSDV1_BNB_Farm.address );
        console.info('xusdbnbfarm: ', xusdbnbfarm)
        if (xusdbnbfarm) {

          const newaddition = {
            name: farmName(xusdbnbfarm),
            baseTokenSymbol: xusdbnbfarm.name[1].toUpperCase(),
            pairedTokenSymbol: xusdbnbfarm.name[0].toUpperCase(),
            address: xusdbnbfarm.farmContract.address,
            decimals: 18,
            pendingRewards: {
              baseToken: xusdbnbfarm.pendingBaseTokenRewards,
              pairedToken: xusdbnbfarm.pendingPairedTokenRewards
            },
            quantity: parseFloat(xusdbnbfarm.userFarmTokenBalance),
            value_in_BUSD: parseFloat(xusdbnbfarm.valueOfUserFarmTokens),
            isLegacy: xusdbnbfarm.is_legacy
          }

          lineInfo.push(newaddition)
        }
      }



      setFarmRows(lineInfo);
      getFarmTotal(lineInfo);
      // getPoolTotal();
    });
  }

  React.useEffect(() => {
    populateTokenRows();
    populateFarmRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateValueAfterTax]);

  React.useEffect(() => {
    if (tokenRows.length > 0) {
      setLoader(false);
    }
  }, [tokenRows]);

  React.useEffect(() => {
    if (account && library) {
      // // console.log('populating token rows')
      populateTokenRows();
      // // console.log('populating farm rows')
      populateFarmRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, rerun]);

  const flipAfterTaxSwitch = (checked) => {
    if (checked) {
      setCalculateValueAfterTaxLabel('Show Before Tax')
    } else {
      setCalculateValueAfterTaxLabel('Show After Tax')
    }
    setCalculateValueAfterTax(checked)
  }

  const renderHoldingsValue = () => {

    var sp = isMobile ? 3 : 3;
    sp = showAPY ? sp + 2 : sp;
    return (
      <TableCell align="right" colSpan={sp}><Typography variant="h6">Holdings Value</Typography></TableCell>
    )
  }

  const renderPair = (row) => {
    const str = formatStringWithCommas(row?.pendingRewards?.pairedToken.toString(), 0)
    if (row?.pairedTokenSymbol !== 'BNB') {
      const ret = isMobile ? <>/ {str} {row?.pairedTokenSymbol}</> : <>{str} {row?.pairedTokenSymbol}</>
      return (
        ret
      )
    }
  }


  const handleFilterMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };
  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const [openCollapsed, setOpenCollapsed] = React.useState(false);
  React.useEffect(() => {
    setIsMobile(windowSize.width < 768 ? true : false);
  }, [windowSize])

  return (
    <Box>
      {account && library ? (
        <Box>
          {!loader ? (
            <Box className="max-w-7xl my-0 mx-auto">
              <Box className="flex justify-between mb-4">
                <Typography variant="h6">
                  Overview
                </Typography>
                <Button onClick={handleFilterMenuClick}>
                  <FilterListIcon />
                </Button>
                <Menu
                  anchorEl={filterMenuAnchor}
                  open={Boolean(filterMenuAnchor)}
                  onClose={handleFilterMenuClose}
                  onClick={handleFilterMenuClose}
                  MenuListProps={{
                    'aria-labelledby': 'basic-button',
                  }}
                >
                  <MenuItem>
                    <FormControlLabel
                      control={<Switch color="secondary" />}
                      label={showAPY ? 'Hide APY Rate' : 'Show APY Rate'}
                      labelPlacement="end"
                      checked={showAPY}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowAPY(e.target.checked)}
                    /></MenuItem>
                  <MenuItem>
                    <FormControlLabel
                      control={<Switch color="secondary" />}
                      label={calculateValueAfterTaxLabel}
                      labelPlacement="end"
                      checked={calculateValueAfterTax}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => flipAfterTaxSwitch(e.target.checked)}
                    />
                  </MenuItem>
                </Menu>
              </Box>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography className="mr-4" variant="h6">Tokens : </Typography>
                  <Typography variant="h6">
                    ${tokenTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails className="overflow-auto">
                  <TableContainer sx={showAPY ? { minWidth: 1100 } : { minWidth: 800 }}>
                    <Table size="small" aria-label="simple table">
                      <TableHead>
                        <TableRow>

                          <TableCell>Token Name</TableCell>

                          {/*<TableCell align="left">Symbol</TableCell>*/}
                          {
                            showAPY ? (
                              <>
                                <TableCell align="left">
                                  Since Inception
                                  <Tooltip title="The total percent gain since the token was launched">
                                    <HelpOutlineIcon className="w-4 h-4 ml-1" />
                                  </Tooltip>
                                </TableCell>
                                <TableCell align="left">
                                  Yearly Percent Return
                                  <Tooltip title="Left: APR (non-compounding), Right: APY (compounding)">
                                    <HelpOutlineIcon className="w-4 h-4 ml-1" />
                                  </Tooltip>
                                </TableCell>
                              </>
                            ) :
                              <></>
                          }


                          <TableCell align="left">
                            Quantity
                            <Tooltip title="The number of tokens you currently have">
                              <HelpOutlineIcon className="w-4 h-4 ml-1" />
                            </Tooltip>
                          </TableCell>

                          <TableCell align="left">Value in Underlying</TableCell>
                          <TableCell align="left">Value in USD</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {/*tokenRows.sort((a, b) => b.value_in_BUSD - a.value_in_BUSD)*/tokenRows.filter((x) => x.quantity > 0 && x.symbol !== 'sUSELESS').map((row, rowIndex, arr) => (
                          <TableRow
                            key={rowIndex}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >

                            <TableCell align="left" component="th" scope="row">
                              <AddToMetamask provider={library} tokenAddress={row?.address} tokenSymbol={row?.symbol} tokenDecimals={row?.decimals} />
                              {row?.name}
                              {row?.name === 'xUSD (v1)' && row?.quantity > 0 ? (
                                <Button style={{ marginLeft: '1.5rem', marginRight: '-1.5rem' }} size="small" variant="contained" color="success" onClick={() => {
                                  handleDialogOpen()
                                }}>
                                  <Tooltip title="Click here migrate your xUSD to V2!">
                                    <span>Migrate to V2!</span>
                                  </Tooltip>
                                </Button>
                              ) : (<></>)}
                            </TableCell>

                            {
                              showAPY ? (

                                <>
                                  <TableCell color="#00cc00" className="italic" align="left">
                                    <Typography variant="overline" color="#00cc00" className="italic">
                                      {fetchTotalGain(row?.price_in_underlying, row?.symbol).toFixed(2)}%
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="left">
                                    <Typography variant="overline" color="#00cc00" className="italic">
                                      {calculateAPR_APY(row?.price_in_underlying, row?.symbol, row?.buy_fee, row?.sell_fee).APR.toFixed(0)}% / {calculateAPR_APY(row?.price_in_underlying, row?.symbol, row?.buy_fee, row?.sell_fee).APY.toFixed(0)}%
                                    </Typography>
                                  </TableCell>
                                </>
                              ) :
                                <> </>
                            }


                            <TableCell align="left">{row?.quantity.toLocaleString(undefined, {
                              minimumFractionDigits: Math.floor(row?.decimals / 3),
                              maximumFractionDigits: Math.floor(row?.decimals / 3)
                            })}</TableCell>
                            <TableCell align="left">{row?.value_underlying.toLocaleString(undefined, {
                              minimumFractionDigits: Math.floor(row?.underlying_decimals / 3),
                              maximumFractionDigits: Math.floor(row?.underlying_decimals / 3)
                            })} {row?.underlying_symbol}</TableCell>
                            <TableCell align="left">${row?.value_in_BUSD.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography className="mr-4" variant="h6">Farms : </Typography>
                  <Typography variant="h6">
                    ${farmTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails className="overflow-auto">
                  <TableContainer sx={{ minWidth: 1100 }}>
                    <Table size="small" aria-label="simple table">
                      <TableHead>
                        <TableRow>

                          <TableCell colSpan={4}>Farm Names</TableCell>

                          <TableCell align="left">Pending Farm Rewards</TableCell>
                          <TableCell align="left"></TableCell>

                          <TableCell align="left">
                            Quantity
                            <Tooltip title="The number of farm tokens you currently have">
                              <HelpOutlineIcon className="w-4 h-4 ml-1" />
                            </Tooltip>
                          </TableCell>

                          <TableCell align="left">Value in USD</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {farmRows.sort((a, b) => b.value_in_BUSD - a.value_in_BUSD).map((row, rowIndex, arr) => (
                          <TableRow
                            key={rowIndex}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >

                            <TableCell colSpan={4} align="left" component="th" scope="row">

                              {
                                row?.isLegacy ? (
                                  <Button onClick={() => {
                                    setTabValue(2)
                                  }}>
                                    <Tooltip title="Farm has ended due to upcoming upgrade. Please unstake">
                                      <ErrorOutlineIcon />
                                    </Tooltip>
                                  </Button>
                                ) : (
                                  <AddToMetamask provider={library} tokenAddress={row?.address} tokenSymbol={row?.name} tokenDecimals={row?.decimals} />
                                )}
                              {row?.name}

                              {row?.isLegacy && row?.name == "BNB-XUSD" ? (
                                <Button style={{ marginLeft: '1.5rem', marginRight: '-1.5rem' }} size="small" variant="contained" color="success" onClick={() => {
                                  handleFarmDialogOpen()
                                }}>
                                  <Tooltip title="Click here migrate your LP tokens to the V2 Farm!">
                                    <span>Migrate to V2 Farm!</span>
                                  </Tooltip>
                                </Button>
                              ) : (<></>)}
                            </TableCell>

                            <TableCell align="left">
                              <Typography variant="overline" color="#00cc00" className="italic">
                                {formatStringWithCommas(row?.pendingRewards?.baseToken.toString(), 3)} {row?.isLegacy ? row?.baseTokenSymbol : ' BNB'}
                              </Typography>
                            </TableCell>
                            <TableCell align="left">
                              <Typography variant="overline" color="#00cc00" className="italic">
                                {renderPair(row)}
                              </Typography>
                            </TableCell>

                            <TableCell align="left">{row?.quantity.toLocaleString(undefined, {
                              minimumFractionDigits: Math.floor(row?.decimals / 3),
                              maximumFractionDigits: Math.floor(row?.decimals / 3)
                            })}</TableCell>


                            <TableCell align="left">${row?.value_in_BUSD.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography className="mr-4" variant="h6">Pools : </Typography>
                  <Typography variant="h6">
                    ${formatStringWithCommas(poolTotal.USD.toString(), 2)}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails className="overflow-auto">
                  <TableContainer sx={{ minWidth: 1100 }}>
                    <Table size="small" aria-label="simple table">
                      <TableHead>
                        <TableRow>

                          <TableCell colSpan={1}>Pool Name</TableCell>
                          <TableCell align="left">
                            Quantity
                            <Tooltip title="The number of farm tokens you currently have">
                              <HelpOutlineIcon className="w-4 h-4 ml-1" />
                            </Tooltip>
                          </TableCell>

                          <TableCell align="left">Pool profit</TableCell>

                          <TableCell align="left">Value in USD</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        
                          <TableRow
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >

                            <TableCell colSpan={1} align="left" component="th" scope="row">

                              <AddToMetamask provider={library} tokenAddress={pools[0]?.StakingContract.address} tokenSymbol={pools[0]?.poolName} tokenDecimals={pools[0]?.StakingContract.decimals} />
                              {pools[0]?.poolName}
                            </TableCell>
                            <TableCell align="left">
                              <Typography variant="overline" className="italic">
                                {formatStringWithCommas(pools[0]?.poolBalanceOfUser.XUSD, 2)} XUSD
                              </Typography>
                            </TableCell>
                            <TableCell align="left">
                              <Typography variant="overline" color="#00cc00" className="italic">
                                {formatStringWithCommas(pools[0]?.overallProfit.XUSD, 2)} XUSD
                              </Typography>
                            </TableCell>
                            <TableCell align="left">
                              <Typography variant="overline" className="italic">
                                ${formatStringWithCommas(pools[0]?.poolBalanceOfUser.USD, 2)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                          <TableRow
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >

                            <TableCell colSpan={1} align="left" component="th" scope="row">

                              <AddToMetamask provider={library} tokenAddress={pools[0]?.StakingContract.address} tokenSymbol={pools[0]?.poolName} tokenDecimals={pools[0]?.StakingContract.decimals} />
                              {pools[1]?.poolName} <span style={{color: '#00dd00'}}>({pools[1]?.rewardToken})</span>
                            </TableCell>
                            <TableCell align="left">
                              <Typography variant="overline" className="italic">
                                {formatStringWithCommas(pools[1]?.poolBalanceOfUser.XUSD, 2)} XUSD
                              </Typography>
                            </TableCell>
                            <TableCell align="left">
                              <Typography variant="overline" color="#00cc00" className="italic">
                                {formatStringWithCommas(pools[1]?.overallProfit.XUSD, 4)} BNB
                              </Typography>
                            </TableCell>
                            <TableCell align="left">
                              <Typography variant="overline" className="italic">
                                ${formatStringWithCommas(pools[1]?.poolBalanceOfUser.USD, 2)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>

              <Paper className="p-4 pt-1 mt-4">
                <Typography variant="h6" className="mt-4">
                  Total Value: ${(tokenTotal + farmTotal + parseFloat(poolTotal.USD)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </Paper>


              <MigrateXUSD open={isDialogOpen} onClose={handleDialogClose} />
              <MigrateXUSDBNBFarm open={isFarmDialogOpen} onClose={handleFarmDialogClose} onSteps={checkFarmSteps} />
            </Box>
          ) : (
            <Grid className="text-center">
              <CircularProgress color="secondary" />
            </Grid>
          )}
        </Box>
      ) : (
        <Typography variant="h6" gutterBottom>
          Please connect your wallet
        </Typography>
      )}
    </Box>
  );
}
