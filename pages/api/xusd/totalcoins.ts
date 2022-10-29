import { Contract, ethers } from "ethers";
import { xUSDReadContract } from "../../../components/wallet/Contracts";

export default function handler(req, res) {
        
    if (req.method === 'GET') {
        const xusdContract = xUSDReadContract()
        xusdContract.totalSupply().then(result => {
            const xusdSupply = ethers.utils.formatUnits(result, 18);
            res.status(200).send(xusdSupply)
        });
    }
  }
