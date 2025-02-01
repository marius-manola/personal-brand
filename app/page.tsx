'use client';

import { motion } from 'framer-motion';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Navigation from '@/components/Navigation';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Navigation />
        
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="py-24 sm:py-32"
        >
          <div className="max-w-3xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-5xl sm:text-7xl font-bold text-zinc-900 dark:text-white tracking-tight"
            >
              Building the future of technology and education.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-6 text-xl text-zinc-600 dark:text-zinc-300"
            >
              Engineering student turned founder, speaker, and tech influencer. 
              Building scalable solutions at the intersection of AI and human potential.
            </motion.p>
          </div>
        </motion.section>

        {/* Achievements Grid */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16"
        >
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <h3 className="text-5xl font-bold text-zinc-900 dark:text-white">500K+</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Tech community members</p>
          </div>
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <h3 className="text-5xl font-bold text-zinc-900 dark:text-white">25+</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Speaking engagements</p>
          </div>
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <h3 className="text-5xl font-bold text-zinc-900 dark:text-white">$2M+</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Raised in venture capital</p>
          </div>
        </motion.section>

        {/* Featured Work */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-12">Featured Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.a 
              href="#startup"
              whileHover={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-8"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                Startup
                <ArrowUpRightIcon className="inline-block ml-2 w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Building next-gen AI tools for education and professional development.
              </p>
            </motion.a>

            <motion.a 
              href="#speaking"
              whileHover={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-8"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                Speaking
                <ArrowUpRightIcon className="inline-block ml-2 w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Keynotes on AI, entrepreneurship, and the future of education.
              </p>
            </motion.a>

            <motion.a 
              href="#engineering"
              whileHover={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-8"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                Engineering
                <ArrowUpRightIcon className="inline-block ml-2 w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Building scalable systems and AI-powered solutions.
              </p>
            </motion.a>

            <motion.a 
              href="#content"
              whileHover={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-8"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                Content
                <ArrowUpRightIcon className="inline-block ml-2 w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Tech insights and entrepreneurship journey for 500K+ followers.
              </p>
            </motion.a>
          </div>
        </section>

        {/* Investors & Partners */}
        <section className="py-16 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-8">
            Backed by World-Class Investors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center opacity-60 dark:opacity-40">
            {/* Add investor logos here */}
          </div>
        </section>

        {/* Contact */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="py-24 text-center"
        >
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
            Let&apos;s Build Something Great
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re an investor, potential partner, or fellow builder, I&apos;d love to connect.
          </p>
          <a 
            href="#contact" 
            className="inline-flex items-center px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-lg font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Get in Touch
            <ArrowUpRightIcon className="ml-2 w-5 h-5" />
          </a>
        </motion.section>
      </div>
    </main>
  );
}
