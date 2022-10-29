import * as React from 'react';
import { Dialog, DialogTitle, Button, Typography, Paper, Box, DialogContent, DialogActions, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import Image from 'next/image'
import { connectors } from "../wallet/Connectors"
import { useWeb3React } from '@web3-react/core';
import { Contract, ethers } from "ethers";
import { useSnackbar } from 'notistack';
import { xUSDV2 } from '../wallet/Contracts';
import { approveOld, allowance, MaxSafeInteger } from "../core/Utils";
import { IConnectorConfig } from '../core/Interfaces';
import PropTypes from 'prop-types';
import { useService, useIsMobile } from '../core/Service';


export default function TokenList(props) {
    const { onClose, open } = props;
    const { enqueueSnackbar } = useSnackbar();
    const [activeStep, setActiveStep] = React.useState(0);
    // const { activate } = useWeb3React();
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
      };
    
      const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
      };
    
      const handleReset = () => {
        setActiveStep(0);
      };

      const xUSDV2Contract = new Contract(xUSDV2.address, xUSDV2.abi, library.getSigner());


    const steps = [
        {
          label: 'Approve',
          description: `This step allows the migration contract to access your XUSD and sell it tax free.`,
          action: async () => {
            let approved = await approveOld(xUSDV2Contract, account);
            if(approved) {
              xUSDV2Contract.on("approve", (event) => {
                //// // console.log("Approved");
                enqueueSnackbar("Approved", { variant: "success" });
                handleNext();
                xUSDV2Contract.removeAllListeners();
              })
            }
          }
        },
        {
          label: 'Migrate!',
          description:
            'Excutes the migration. Your XUSD will be converted to V2 tokens and deposited into your wallet.',
            action: async () => {
              let approved = await approveOld(xUSDV2Contract, account);
              if(approved) {
                xUSDV2Contract.on("approve", (event) => {
                 // // // console.log("Approved");
                  enqueueSnackbar("Approved", { variant: "success" });
                  handleNext();
                  xUSDV2Contract.removeAllListeners();
                })
              }
            }
        },
        
      ];


    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog maxWidth="xs" onClose={handleClose} open={open}>
            <DialogTitle>xUSD V2 Migration</DialogTitle>

            <DialogContent>

            <Box sx={{ maxWidth: 400 }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={
                index === 2 ? (
                  <Typography variant="caption">Last step</Typography>
                ) : null
              }
            >
              {step.label}
            </StepLabel>
            <StepContent>
              <Typography>{step.description}</Typography>
              <Box sx={{ mb: 2 }}>
                {/* <div>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Back
                  </Button>
                </div> */}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
      {activeStep === steps.length && (
        <Paper square elevation={0} sx={{ p: 3 }}>
          <Typography>All steps completed - you&apos;re finished</Typography>
          <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
            Reset
          </Button>
        </Paper>
      )}
    </Box>
               
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

TokenList.propTypes = {
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
};