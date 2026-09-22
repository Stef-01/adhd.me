import '../../../../styles/mia-world.css';
import type {Metadata} from 'next';
import {MiaWorldGame} from '../../../../lives/mia-world/player';
import {ROBOTS_META} from '@/security/robots';
export const metadata:Metadata={title:'Mia: Remember why — ADHD Lives',description:'Connect a thought through interruptions, park competing ideas and try an external cue with Mia.',alternates:{canonical:'/lives/play/mia-remember-why'},robots:ROBOTS_META};
export default function Page(){return <main id="main-content"><MiaWorldGame/></main>}
