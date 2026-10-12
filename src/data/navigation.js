/**
 * Navigation and footer link definitions.
 *
 * Kept as data so the header, the mobile drawer and the footer all render the
 * same list, and adding a destination is a one-line change.
 */

import {
  GridIcon,
  HomeIcon,
  InfoIcon,
  BookOpenIcon,
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  XIcon,
} from '../components/Icons';

/** Primary navigation, shown in the header and the mobile drawer. */
export const navItems = [
  { label: 'Home', to: '/', icon: HomeIcon, end: true },
  { label: 'Recipes', to: '/recipes', icon: BookOpenIcon, end: false },
  { label: 'Categories', to: '/categories', icon: GridIcon, end: false },
  { label: 'About', to: '/about', icon: InfoIcon, end: false },
];

/** Footer column: site navigation. */
export const quickLinks = [
  { label: 'Home', to: '/', icon: HomeIcon, end: true },
  { label: 'Recipes', to: '/recipes', icon: BookOpenIcon, end: false },
  { label: 'Categories', to: '/categories', icon: GridIcon, end: false },
  { label: 'About', to: '/about', icon: InfoIcon, end: false },
];

/** Footer column: the featured recipe categories. */
export const categoryLinks = [
  { label: 'Beef', to: '/recipes?category=Beef', icon: null, end: false },
  { label: 'Chicken', to: '/recipes?category=Chicken', icon: null, end: false },
  { label: 'Pasta', to: '/recipes?category=Pasta', icon: null, end: false },
  { label: 'Cake', to: '/recipes?category=Dessert', icon: null, end: false },
];

/** Outbound social profiles. */
export const socialLinks = [
  { label: 'Recipe Discovery on Facebook', href: 'https://www.facebook.com', icon: FacebookIcon },
  { label: 'Recipe Discovery on Instagram', href: 'https://www.instagram.com', icon: InstagramIcon },
  { label: 'Recipe Discovery on YouTube', href: 'https://www.youtube.com', icon: YoutubeIcon },
  { label: 'Recipe Discovery on X', href: 'https://x.com', icon: XIcon },
];
