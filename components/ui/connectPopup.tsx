import * as React from 'react';
import { Dialog, DialogTitle, Button, Typography, Grid,  DialogContent, DialogActions } from '@mui/material';
import Image from 'next/image'
import { connectors } from "../wallet/Connectors"
import { useWeb3React } from '@web3-react/core';
import { useSnackbar } from 'notistack';
import { IConnectorConfig } from '../core/Interfaces';
import PropTypes from 'prop-types';
import { useService, useIsMobile } from '../core/Service';


export default function ConnectPopup(props) {
    const { onClose, open } = props;
    const { enqueueSnackbar } = useSnackbar();
    // const { activate } = useWeb3React();
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();

    const isMobile = useIsMobile()

    const handleConnectorSelected = async (selected: IConnectorConfig) => {

        activate(selected.connector, null, true).then(() => {
            enqueueSnackbar('Successfullly connected to wallet', { variant: 'success' });

        }).catch(err => {
            if (err.name === "UnsupportedChainIdError") {
                enqueueSnackbar("Please switch to the Binance Smart Chain and try again", { variant: 'error' });
            } else {
                enqueueSnackbar(err.message, { variant: 'error' });
            }
        }).finally(() => {
            handleClose();
        });
    }


    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog maxWidth="xs" onClose={handleClose} open={open}>
            <DialogTitle>Connect your wallet</DialogTitle>

            <DialogContent>
                <Grid container>
                    {connectors.map(connector => (
                        <Grid item textAlign="center"  xs={6} key={connector.name}  onClick={() => handleConnectorSelected(connector)}>
                            <Button sx={{margin: '1rem', padding: '1rem', border: '1px dashed grey' }}>
                                <Image alt={connector.name} src={connector.logo} width={!isMobile ? 161 : 125} height={!isMobile ? 161 : 125} />
                                <Typography variant="inherit" className="sm:text-base text-xs text-center" sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>{connector.name}</Typography>
                            </Button>
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}


ConnectPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
};