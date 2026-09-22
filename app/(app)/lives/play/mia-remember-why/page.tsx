import '../../../../styles/mia-world.css';
import type {Metadata} from 'next';
import {MiaWorldGame} from '../../../../lives/mia-world/player';
import {ROBOTS_META} from '@/security/robots';
export const metadata:Metadata={title:'Mia: Remember why — ADHD Lives',description:'Carry intentions between rooms, place useful cues and make a shared plan with Mia.',alternates:{canonical:'/lives/play/mia-remember-why'},robots:ROBOTS_META};
export default function Page(){return <main id="main-content"><MiaWorldGame/></main>}
