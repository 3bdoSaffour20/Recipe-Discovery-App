/**
 * Navigation and footer link definitions.
 *
 * Kept as data so the header, the mobile drawer and the footer all render the
 * same list, and adding a destination is a one-line change.
 */

import {
  GridIcon,
  HeartIcon,
  HomeIcon,
  InfoIcon,
  BookOpenIcon,
  SearchIcon,
  ShuffleIcon,
  FacebookIcon,
  InstagramIcon,
  XIcon,
  PinterestIcon,
} from '../components/Icons';

/** Primary navigation, shown in the header and the mobile drawer. */
export const navItems = [
  { label: 'Home', to: '/', icon: HomeIcon, end: true },
  { label: 'Recipes', to: '/recipes', icon: BookOpenIcon, end: false },
  { label: 'Categories', to: '/categories', icon: GridIcon, end: false },
  { label: 'About', to: '/about', icon: InfoIcon, end: false },
];

/** Footer: site navigation. */
export const quickLinks = [
  { label: 'Home', to: '/', icon: HomeIcon, end: true },
  { label: 'Explore Recipes', to: '/recipes', icon: BookOpenIcon, end: false },
  { label: 'Categories', to: '/categories', icon: GridIcon, end: false },
  { label: 'Favourites', to: '/favorites', icon: HeartIcon, end: false },
  { label: 'About Us', to: '/about', icon: InfoIcon, end: false },
];

/** Footer: recipe discovery shortcuts. */
export const recipeLinks = [
  { label: 'Popular Recipes', to: '/recipes', icon: SearchIcon, end: false },
  { label: 'Random Recipe', to: '/recipe/random', icon: ShuffleIcon, end: false },
  { label: 'Beef', to: '/recipes?category=Beef', icon: null, end: false },
  { label: 'Chicken', to: '/recipes?category=Chicken', icon: null, end: false },
  { label: 'Pasta', to: '/recipes?category=Pasta', icon: null, end: false },
  { label: 'Dessert', to: '/recipes?category=Dessert', icon: null, end: false },
];

/** Outbound social profiles. */
export const socialLinks = [
  { label: 'Recipe Discovery on Facebook', href: 'https://www.facebook.com', icon: FacebookIcon },
  { label: 'Recipe Discovery on Instagram', href: 'https://www.instagram.com', icon: InstagramIcon },
  { label: 'Recipe Discovery on X', href: 'https://x.com', icon: XIcon },
  { label: 'Recipe Discovery on Pinterest', href: 'https://www.pinterest.com', icon: PinterestIcon },
];