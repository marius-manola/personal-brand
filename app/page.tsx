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
              Building AI tools for the next generation.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-6 text-xl text-zinc-600 dark:text-zinc-300"
            >
              18-year-old founder and engineering student. Building PromptEasy to revolutionize AI dataset creation, 
              while sharing my journey in tech and entrepreneurship.
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
            <h3 className="text-5xl font-bold text-zinc-900 dark:text-white">50K+</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Students taught on Udemy</p>
          </div>
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <h3 className="text-5xl font-bold text-zinc-900 dark:text-white">N&W S4</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Buildspace participant</p>
          </div>
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <h3 className="text-5xl font-bold text-zinc-900 dark:text-white">PromptEasy</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">AI Dataset Platform</p>
          </div>
        </motion.section>

        {/* Featured Work */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-12">What I Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.a 
              href="#startup"
              whileHover={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-8"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                PromptEasy
                <ArrowUpRightIcon className="inline-block ml-2 w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Streamlining dataset creation for fine-tuning GPT models with high-quality synthetic data.
              </p>
            </motion.a>

            <motion.a 
              href="https://www.youtube.com/@mariusmanolachi"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-8"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                YouTube
                <ArrowUpRightIcon className="inline-block ml-2 w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Sharing my engineering journey, project builds, and insights into tech and entrepreneurship.
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
                Building AI-powered solutions and sharing my learning experiences as an engineering student.
              </p>
            </motion.a>

            <motion.a 
              href="#teaching"
              whileHover={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-8"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                Education
                <ArrowUpRightIcon className="inline-block ml-2 w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Teaching 50,000+ students on Udemy, sharing knowledge about technology and development.
              </p>
            </motion.a>
          </div>
        </section>

        {/* Projects Section */}
        <section className="py-16 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-8">
            Featured Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
              <h3 className="font-semibold text-zinc-900 dark:text-white">PromptEasy</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Platform for creating high-quality datasets for GPT model fine-tuning
              </p>
            </div>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Buildspace N&W S4</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Currently building innovative projects in the Nights & Weekends program
              </p>
            </div>
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
            Let&apos;s Connect
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re interested in AI, engineering, or building cool stuff, I&apos;d love to chat.
          </p>
          <a 
            href="https://www.youtube.com/@mariusmanolachi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-lg font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Subscribe on YouTube
            <ArrowUpRightIcon className="ml-2 w-5 h-5" />
          </a>
        </motion.section>
      </div>
    </main>
  );
}
