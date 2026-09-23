import '../../../../styles/lives-kit.css';
import '../../../../styles/jax-world.css';
import type { Metadata } from 'next';
import { JaxWorldGame } from '../../../../lives/jax-world/player';
import { ROBOTS_META } from '@/security/robots';
export const metadata:Metadata={title:'Jax: Just the list — ADHD Lives',description:'Steer a trolley down the aisle with Jax, knock the lures away and keep to the list.',alternates:{canonical:'/lives/play/jax-just-the-list'},robots:ROBOTS_META};
export default function Page(){return <main id="main-content"><JaxWorldGame/></main>}
