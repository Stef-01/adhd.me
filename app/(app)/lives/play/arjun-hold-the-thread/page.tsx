import '../../../../styles/lives-kit.css';
import '../../../../styles/arjun-world.css';
import type { Metadata } from 'next';
import { ArjunWorldGame } from '../../../../lives/arjun-world/player';
import { ROBOTS_META } from '@/security/robots';
export const metadata:Metadata={title:'Arjun: Hold the thread — ADHD Lives',description:'Build a shared plan, park an idea and return to a changing meeting with Arjun.',alternates:{canonical:'/lives/play/arjun-hold-the-thread'},robots:ROBOTS_META};
export default function Page(){return <main id="main-content"><ArjunWorldGame/></main>}
