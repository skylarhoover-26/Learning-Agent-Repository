'use client';

// Renders a monochrome lucide "stencil" line icon in place of a colorful iOS
// emoji — the app-wide preference. Maps the emojis actually used across the
// library / lessons / achievements to line-icon equivalents; anything unmapped
// falls back to a neutral Lightbulb so a raw color emoji is never shown.
import {
  Target, BarChart3, Bot, CheckCircle2, MessagesSquare, MessageSquare, Mail,
  Search, PenLine, Brain, Rocket, Zap, Lightbulb, BookOpen, Calendar, FileText,
  ScrollText, HelpCircle, Star, Megaphone, TrendingDown, TrendingUp, Phone,
  Trophy, Mic, Palette, RefreshCw, Wrench, Map, Puzzle, Scale, Shield,
  ClipboardList, Hash, Smartphone, Ticket, GraduationCap, Flame, Gamepad2,
} from 'lucide-react';

const EMOJI_ICON = {
  '🎯': Target, '🧵': MessageSquare, '📊': BarChart3, '🤖': Bot, '✅': CheckCircle2,
  '💬': MessagesSquare, '🗣️': MessagesSquare, '📧': Mail, '✉️': Mail, '🔍': Search, '🔎': Search,
  '📝': PenLine, '🧠': Brain, '🚀': Rocket, '⚡': Zap, '💡': Lightbulb, '📈': TrendingUp,
  '📉': TrendingDown, '📚': BookOpen, '📖': BookOpen, '📅': Calendar, '📄': FileText, '📜': ScrollText,
  '❓': HelpCircle, '🤔': HelpCircle, '⭐': Star, '🌟': Star, '📢': Megaphone, '📞': Phone, '🏆': Trophy,
  '🎤': Mic, '🎨': Palette, '🔄': RefreshCw, '🔧': Wrench, '🗺️': Map, '🧩': Puzzle,
  '⚖️': Scale, '🛡️': Shield, '📋': ClipboardList, '🔢': Hash, '📱': Smartphone, '🎟️': Ticket,
  '🎓': GraduationCap, '🤓': GraduationCap, '🔥': Flame, '🎮': Gamepad2, '🕹️': Gamepad2, '💯': CheckCircle2,
  '✏️': PenLine, '🔟': Hash, '🏔️': Trophy,
};

export default function EmojiIcon({ emoji, className = 'w-5 h-5', style }) {
  const Ic = EMOJI_ICON[emoji] || Lightbulb;
  return <Ic className={className} style={style} aria-hidden="true" />;
}
