import '../../../../styles/lives-kit.css';
import '../../../../styles/nina-world.css';
import type { Metadata } from 'next';
import { NinaWorldGame } from '../../../../lives/nina-world/player';
import { ROBOTS_META } from '@/security/robots';
export const metadata:Metadata={title:'Nina: The first line — ADHD Lives',description:'Steer Nina’s pen through the words of a real first draft before the critic’s blots gather.',alternates:{canonical:'/lives/play/nina-the-first-line'},robots:ROBOTS_META};
export default function Page(){return <main id="main-content"><NinaWorldGame/></main>}
