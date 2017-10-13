import * as React from "react";
import { IRoom, IUser, IRoomOptions } from "../types";
import {
    Table,
    TableBody,
    TableHeader,
    TableHeaderColumn,
    TableRow,
    TableRowColumn,
} from "material-ui/Table";
import FloatingActionButton from "material-ui/FloatingActionButton";
import ContentAdd from "material-ui/svg-icons/content/add";
import NewRoomDialog from "./NewRoomDialog";

import { withStyles, WithStyles } from "material-ui-next";

const styles = {
    create: {
        float: "right",
    },
};

type ClassNames = keyof typeof styles;

interface Props {
    rooms: IRoom[];
    onCreateNewRoom: (description: string, opt: IRoomOptions) => void;
}

interface State {
    newRoomDialogOpen: boolean;
}

class RoomList extends React.Component<Props & WithStyles<ClassNames>, State> {

    constructor(props: Props & WithStyles<ClassNames>) {
        super(props);
        this.state = { newRoomDialogOpen: false };
    }

    handleCellClick = (row: number, col: number) => {
        console.log(this.props.rooms[row]);
        return;
    }

    handleRoomClick = (no: number) => {
        console.log("room#" + no + " clicked!");
    }

    handleOpen = () => {
        this.setState({ newRoomDialogOpen: true });
    }
    handleClose = () => {
        this.setState({ newRoomDialogOpen: false });
    }

    render() {
        const classes = this.props.classes;
        const items = this.props.rooms.map((room) => {
            return (
                <TableRow key={room.no}>
                    <TableRowColumn>{"#" + room.no}</TableRowColumn>
                    <TableRowColumn>{room.description}</TableRowColumn>
                    <TableRowColumn>{room.players.join(", ")}</TableRowColumn>
                    <TableRowColumn>{"-----"}</TableRowColumn>
                </TableRow>
            );
        });
        return (
            <div>
                <FloatingActionButton className={classes.create} onClick={this.handleOpen}>
                    <ContentAdd />
                </FloatingActionButton>
                <Table onCellClick={this.handleCellClick}>
                    <TableHeader displaySelectAll={false}>
                        <TableRow >
                            <TableHeaderColumn>部屋番号</TableHeaderColumn>
                            <TableHeaderColumn>説明</TableHeaderColumn>
                            <TableHeaderColumn>プレイヤー</TableHeaderColumn>
                            <TableHeaderColumn>設定</TableHeaderColumn>
                        </TableRow>
                    </TableHeader>
                    <TableBody displayRowCheckbox={false} stripedRows >
                        {items}
                    </TableBody>
                </Table>
                <NewRoomDialog open={this.state.newRoomDialogOpen} onClose={this.handleClose} onCreateNewRoom={this.props.onCreateNewRoom} />
            </div>
        );
    }
}

export default withStyles(styles)(RoomList);