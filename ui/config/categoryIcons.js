import {
  Laptop, Briefcase, BookOpen, Globe, Calculator, Stethoscope,
  Heart, Star, Music, FlaskConical, Pencil, Moon, Library,
} from 'lucide-react';

export const CATEGORY_ICONS = {
  laptop: Laptop,
  briefcase: Briefcase,
  book: BookOpen,
  globe: Globe,
  calculator: Calculator,
  stethoscope: Stethoscope,
  heart: Heart,
  star: Star,
  music: Music,
  flask: FlaskConical,
  pencil: Pencil,
  moon: Moon,
};

export function CategoryIcon({ name, size = 28, strokeWidth = 1.75, ...rest }) {
  const Icon = CATEGORY_ICONS[name] || Library;
  return <Icon size={size} strokeWidth={strokeWidth} {...rest} />;
}
