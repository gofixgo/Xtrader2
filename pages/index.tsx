import type { AppProps } from 'next/app'

import React, { useEffect } from 'react';
import {
    AppBar, Alert, Stack, Box, Container, CssBaseline,
    IconButton, Button, Switch, Tab, Tabs, ThemeProvider,
    Toolbar, Typography, Menu, MenuItem, AlertColor, Snackbar, Dialog,
    DialogTitle, DialogContent, styled, FormControlLabel, FormGroup, Badge
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useWeb3React } from '@web3-react/core';
import { useSnackbar } from 'notistack';
import Image from 'next/image'
import Cookies from 'js-cookie'
// import { useGlobalState } from '../components/core/StateManager';

import MenuTab from '../components/ui/MenuTab';
import ConnectPopup from "../components/ui/connectPopup";
import SurgeFundPopup from "../components/ui/surgeFundPopup";
import { TabPanel } from '../components/ui/TabPanel';
import Monitor from '../components/views/monitor';
import Swap from '../components/views/swap';
import EarnPage from '../components/views/EarnPage';
import WinPage  from '../components/views/winPage';
import CreatePage  from '../components/views/create';
import { useService, useIsMobile, useWindowSize, useBNBPrice, } from '../components/core/Service';
import { useGlobalState } from '../components/core/StateManager';
import { readOnlyConnector } from '../components/wallet/Connectors';

import xtrader_dark_theme_logo from '../resources/logo_dark_theme.svg'

function Index({ Component, pageProps }: AppProps) {
    // const [, setAccount] = useGlobalState('account');
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React()
    const readOnly = useWeb3React('readOnly')
    // const [getLibrary, setLibrary] = React.useState(library)
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const [balance, setBalance] = useGlobalState('BNBbalance');
    const [generalTokenInfo, setGeneralTokenInfo] = useGlobalState('generalTokenInfo');
    const [rerun, setRerun] = useGlobalState('rerun');
    useBNBPrice();
    useService();
    useWindowSize();
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [isSurgeFundDialogOpen, setSurgeFundDialogOpen] = React.useState(false);
    const [tabValue, setTabValue] = useGlobalState('tabValue');
    const [accountMenuAnchor, setAccountMenuAnchor] = React.useState(null);
    const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState(null);

    const [appVersion, setAppVersion] = React.useState("");
    const [newUpdatesDialogOpen, setNewUpdatesDialogOpen] = React.useState(false);
    const [changeLogList, setChangeLogList] = React.useState<JSX.Element[]>();
    const [updatesPopupTitle, setUpdatesPopupTitle] = React.useState("");

    const accountMenuOpen = Boolean(accountMenuAnchor);
    const mobileMenuopen = Boolean(mobileMenuAnchor)
    const [windowSize, setWindowSize] = useGlobalState('windowSize');
    const [isMobile, setIsMobile] = React.useState(false);

    const handleAccountMenuClick = (event: any) => {
        setAccountMenuAnchor(event.currentTarget);
    };
    const handleAccountMenuClose = () => {
        setAccountMenuAnchor(null);
    };
    const handleMobileMenuClick = (event: any) => {
        setMobileMenuAnchor(event.currentTarget);
    };
    const handleMobileMenuClose = (value) => {
        if (value >= 0 && 3 >= value) {
            setTabValue(value)
        }
        setMobileMenuAnchor(null);
    };

    const handleDialogOpen = () => {
        setDialogOpen(true)
    };

    const handleDialogClose = () => {
        setDialogOpen(false)
    };

    const handleSurgeFundDialogOpen = () => {
        setSurgeFundDialogOpen(true)
    };

    const handleSurgeFundDialogClose = () => {
        setSurgeFundDialogOpen(false)
    };

    const handleNewUpdatesDialogClose = () => {
        setNewUpdatesDialogOpen(false);
    };

    async function disconnect() {
        try {
            deactivate()
            enqueueSnackbar('Successfullly disconnected wallet', {
                variant: 'success',
                autoHideDuration: 3000,
            });
        } catch (ex) {
        }
    }

    function showChangeLog() {
        if (appVersion == "") {
            fetch('api/changelogs').then(res => res.json()).then(data => {
                if (data.length > 0) {
                    const latest_version = data[0];
                    setAppVersion(latest_version.version);
                    setChangeLogList(buildChangeLogList(latest_version.content));
                    setUpdatesPopupTitle(latest_version.name)

                    // Load up new updates popup if user has not seen current version
                    let cookie_popup_version = Cookies.get('xsurge_app_popup_version');
                    if (cookie_popup_version == undefined || cookie_popup_version != latest_version.version) {
                        Cookies.set('xsurge_app_popup_version', latest_version.version, { expires: 30, path: '/' });
                        setNewUpdatesDialogOpen(true);
                    }
                }
            });
        }
    }
    React.useEffect(() => {
        readOnly.activate(readOnlyConnector).then((active) => {
            // // // console.log('readOnly activated', readOnly.library)
        })
        // initalize general token info
        // if (account && library && Object.keys(generalTokenInfo).length == 0) {
        //     Service(account, library).then(result => {
        //         // // // console.log('result in index: ', result);
        //         setGeneralTokenInfo(result);
        //     });
        // }

        showChangeLog();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const buildChangeLogList = (changelog) => {
        return Object.keys(changelog).map(function (key, index) {
            return (
                <Box key={index}>
                    <Box className="border-solid border-white border-b mb-2">
                        <Typography variant="body1" align="left" style={{ marginTop: '1rem' }}>
                            {key} Changes
                        </Typography>
                    </Box>
                    {buildChangeLogListItems(changelog[key])}
                </Box>
            )
        });
    };

    const buildChangeLogListItems = (items) => {
        return (
            <ul className="list-disc list-inside ml-2">
                {items.map((item, index) => {
                    return (
                        <li key={index}>{item}</li>
                    )
                })}
            </ul>
        )
    };



    React.useEffect(() => {
        setIsMobile(windowSize.width < 768 ? true : false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize])



    return (
        <Box>
            <AppBar position="sticky">
                <Toolbar>
                    {isMobile ? (
                        <><Box>
                            <IconButton
                                id="basic-button"
                                aria-controls="basic-menu"
                                aria-haspopup="true"
                                aria-expanded={mobileMenuopen ? 'true' : undefined}
                                onClick={handleMobileMenuClick}
                            >
                                {!mobileMenuopen ? (
                                    <MenuIcon />
                                ) : (
                                    <MenuOpenIcon />
                                )}
                            </IconButton>
                            <Menu
                                id="basic-menu"
                                anchorEl={mobileMenuAnchor}
                                open={mobileMenuopen}
                                onClose={handleMobileMenuClose}
                                MenuListProps={{
                                    'aria-labelledby': 'basic-button',
                                }}
                            >
                                <MenuItem onClick={() => { handleMobileMenuClose(0); }}>Monitor</MenuItem>
                                <MenuItem onClick={() => { handleMobileMenuClose(1); }}>Swap</MenuItem>
                                <MenuItem onClick={() => { handleMobileMenuClose(2); }}>Earn</MenuItem>
                                <MenuItem divider={true} onClick={() => { handleMobileMenuClose(3); }}>Win</MenuItem>
                                <MenuItem dense={true}>
                                    <Typography variant="subtitle2" align="center" style={{ fontSize: '0.6rem' }}>
                                        Alpha v{appVersion}
                                    </Typography>
                                </MenuItem>
                            </Menu>
                        </Box>
                            <Box className="flex justify-around items-center p-4 mx-auto w-32">
                                <Image src={xtrader_dark_theme_logo} alt={"xtrader"} />
                            </Box>
                        </>
                    ) : (

                        <><Box className="w-40">
                            <Image src={xtrader_dark_theme_logo} alt={"xtrader"} />
                            <Typography variant="subtitle2" style={{ fontSize: '0.75rem' }}>
                                Alpha v{appVersion}
                            </Typography>
                        </Box><Container>
                                <Tabs value={tabValue}
                                    onChange={(event: React.SyntheticEvent, newValue: number) => {
                                        setTabValue(newValue);
                                    }} centered>
                                    <MenuTab name="Monitor"/>
                                    <MenuTab name="Swap"/>
                                    <MenuTab name="Earn"/>
                                    <MenuTab hasIndicator={true} name="Win"/>
                                    <MenuTab hasIndicator={true} name="Create"/>
                                </Tabs>

                            </Container></>

                    )}

                    {account ? (<LoadingButton
                        onClick={() => {
                            setRerun(true)
                        }}
                        loading={rerun}
                        disabled={rerun}
                    >
                        <AutorenewIcon />
                    </LoadingButton>) : null}

                    <Box component="div" id="walletbtn" className={"flex justify-between items-center " + (!library && !account && !active ? 'shiny' : '')} style={
                        {
                            width: '136px !important',
                            height: '36px !important',
                            border: active ? '1px solid #21bbb1' : '1px solid rgb(33 187 177 / 33%)',
                            borderRadius: '2rem',
                            transition: 'all 0.33s ease',
                            cursor: 'pointer'
                        }
                    } onClick={!library && !account && !active ? handleDialogOpen : handleAccountMenuClick}>
                        <IconButton sx={{
                            color: active ? 'rgb(33 187 177) !important' : 'rgb(33 187 177 / 33%) !important',
                            border: active ? '3px solid rgb(33 187 177)' : '3px solid rgb(33 187 177 / 33%)',
                            height: '36px !important',
                            width: '36px !important',
                            fontSize: '12px !important',
                            transition: 'all 0.33s ease',
                            transform: active ? 'translateX(105px)' : 'translateX(0px)',
                            "&:hover": {
                                backgroundColor: 'transparent',
                                border: '3px solid rgb(33 187 177 / 75%)',
                                color: 'rgb(33 187 177 / 75%) !important',
                            },
                        }}>

                            <AccountBalanceWalletIcon />
                        </IconButton>
                        <Box style={
                            (active) ?
                                { paddingLeft: '1rem', paddingRight: ' 0.5rem', position: 'relative', right: '36px' } :
                                { paddingLeft: '0.5rem', paddingRight: '1rem' }
                        }>
                            <Typography variant="subtitle2" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {active ? `${account.slice(0, 6)}...${account.slice(account.length - 4, account.length)}` : "Connect Wallet"}
                            </Typography>
                        </Box>
                    </Box>

                    <Menu
                        anchorEl={accountMenuAnchor}
                        open={accountMenuOpen}
                        onClose={handleAccountMenuClose}
                        onClick={handleAccountMenuClose}
                        MenuListProps={{
                            'aria-labelledby': 'basic-button',
                        }}
                    >
                        <MenuItem>{active ? `${account.slice(0, 6)}...${account.slice(account.length - 4, account.length)}` : ""}</MenuItem>
                        <MenuItem onClick={disconnect}>Disconnect Wallet</MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Box p={2} className="overflow-auto">
                <TabPanel value={tabValue} index={0}>
                    <Monitor />
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                    <Swap />
                </TabPanel>
                <TabPanel value={tabValue} index={2}>
                    <EarnPage />
                </TabPanel>
                <TabPanel value={tabValue} index={3}>
                    <WinPage />
                </TabPanel>
                <TabPanel value={tabValue} index={4}>
                    <CreatePage />
                </TabPanel>
                <Box id="spacer" className="h-20"></Box>
            </Box>
            <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
                <Toolbar sx={{ justifyContent: 'center' }}>
                    {library && account ? (
                        <Button variant="outlined" onClick={handleSurgeFundDialogOpen}> Surge Fund </Button>
                    ) : (
                        <Button variant="outlined" disabled onClick={handleSurgeFundDialogOpen}> Surge Fund </Button>
                    )}

                </Toolbar>
            </AppBar>

            <Dialog open={newUpdatesDialogOpen} onClose={handleNewUpdatesDialogClose} maxWidth="xs" fullWidth className="text-center">
                <Box style={{ border: '4px solid #272727' }}>
                    <DialogTitle className="text-center" style={{ backgroundColor: '#272727', color: 'rgb(33 187 177)', fontWeight: 'bold' }}>
                        {updatesPopupTitle}
                    </DialogTitle>
                    <DialogContent className="text-left border" style={{ paddingLeft: '10px', paddingRight: '10px', borderColor: '#272727', backgroundColor: '#121212b3' }}>
                        <Box>
                            <Typography variant="body1" align="center" style={{ marginTop: '1rem' }}>
                                Here are the latest updates for version {appVersion}
                            </Typography>
                            {changeLogList}
                        </Box>
                    </DialogContent>
                </Box>
                <Button style={{ backgroundColor: '#121212', border: '4px solid #272727', borderRadius: '0px 0px 5px 5px', borderTop: '0px' }} onClick={handleNewUpdatesDialogClose}>
                    Close
                </Button>
            </Dialog>

            <ConnectPopup open={isDialogOpen} onClose={handleDialogClose} />

            {/* <SurgeFundPopup open={isSurgeFundDialogOpen} onClose={handleSurgeFundDialogClose} /> */}

        </Box>
    )
}

export default Index;
