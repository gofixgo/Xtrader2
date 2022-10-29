import { useRouter } from "next/router";
import Index from ".";
import { useGlobalState } from "../components/core/StateManager";
import MyApp from "./_app";
function useSetViewToStableSwap() {
    const [tabValue, setTabValue] = useGlobalState('tabValue');
    const [swapCard, setSwapCard] = useGlobalState('swapCardType');
    setTabValue(1)
    setSwapCard(2)
}
function useStableSwap() {
    useSetViewToStableSwap()
    const router = useRouter()
    router.push('/')
    return null
}
  
export default useStableSwap
  
