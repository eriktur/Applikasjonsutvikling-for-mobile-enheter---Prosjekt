import React from 'react';
import { IonHeader, IonTitle } from '@ionic/react';
import '../style/header.css';

const Header: React.FC = () => {
    return (
    <IonHeader className="header">
            <IonTitle classname="title">Todo List</IonTitle>
    </IonHeader>
);
};
export default Header;