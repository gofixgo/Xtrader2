import { Badge, Tab } from "@mui/material";
import PropTypes from 'prop-types'


export default function MenuTab(props) {
    // hasIndicator prop is passed in by Tabs component
    const { hasIndicator, name } = props;

    return (
        <Tab {...props} label={hasIndicator ? (< Badge badgeContent="new" variant="dot" color="error" >
            {name}
        </Badge>) : name} />
    )
}

MenuTab.propTypes = {
    hasIndicator: PropTypes.bool,
    name: PropTypes.string,
}