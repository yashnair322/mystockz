import { motion } from 'framer-motion';

/**
 * Scroll-triggered reveal wrapper. Use anywhere to fade-up content as it
 * scrolls into view. Use `delay` and `y` to stagger.
 */
const Reveal = ({ children, delay = 0, y = 24, duration = 0.55, className = '', once = true, ...rest }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
