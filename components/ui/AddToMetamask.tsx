import { Button, Tooltip, IconButton } from '@mui/material'
import Image from 'next/image';
import React from 'react'
import metamask_logo from '../../resources/metamask_logo.png';

interface AddToMetamaskProps {
  provider: any,
  tokenAddress: string,
  tokenSymbol: string,
  tokenDecimals: any,
}
const addToken = (provider, tokenAddress, tokenSymbol, tokenDecimals) => {
  provider.provider.sendAsync({
    method: 'metamask_watchAsset',
    params: {
      "type": "ERC20",
      "options": {
        "address": tokenAddress,
        "symbol": tokenSymbol,
        "decimals": tokenDecimals,
        "image": "https://xsurge.net/assets/img/xlogo.png",
      },
    },
    id: Math.round(Math.random() * 100000),
  }, (err, added) => {
    // // // console.log('provider returned', err, added)
    if (err || 'error' in added) {
      //   this.setState({
      //     errorMessage: 'There was a problem adding the token.',
      //     message: '',
      //   })
      return
    }
    // this.setState({
    //   message: 'Token added!',
    //   errorMessage: '',
    // })
  })
  // .then(() => {console.error})
  // .catch(() => {console.error})
}
export function AddToMetamask(props: AddToMetamaskProps) {
  const { provider, tokenAddress, tokenSymbol, tokenDecimals } = props;
  // // // console.log(props)
  return (
    <Button
      onClick=
      {() => addToken(provider, tokenAddress, tokenSymbol, tokenDecimals)}>
        <Image width={25} height={25} src={metamask_logo} alt="metamask logo" />
    </Button>
  )
}