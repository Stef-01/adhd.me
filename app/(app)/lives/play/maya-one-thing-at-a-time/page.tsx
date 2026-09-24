import '../../../../styles/lives-kit.css';
import '../../../../styles/maya-world.css';
import type { Metadata } from 'next';
import { MayaWorldGame } from '../../../../lives/maya-world/player';
import { ROBOTS_META } from '@/security/robots';
export const metadata:Metadata={title:'Maya: One thing at a time — ADHD Lives',description:'Cross a busy concourse with Maya, find room to think and set boundaries for next time.',alternates:{canonical:'/lives/play/maya-one-thing-at-a-time'},robots:ROBOTS_META};
export default function Page(){return <main id="main-content"><MayaWorldGame/></main>}
