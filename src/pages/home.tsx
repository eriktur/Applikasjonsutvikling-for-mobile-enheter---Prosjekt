import React from 'react';
import { IonContent, IonPage, IonButton } from '@ionic/react';
import Header from '../components/header';
import Lists from '../components/lists'
import '../style/home.css';


const Home: React.FC = () => {

    return (
        <IonPage>
            <Header/>
            <Lists/>
            <IonContent>
            </IonContent>
        </IonPage>
    );
};

export default Home;
