'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Navigation from '@/components/Navigation';
import { useRef } from 'react';

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50" ref={containerRef}>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50 opacity-70" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <Navigation />
        
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{ opacity, scale }}
          className="py-20 sm:py-32 md:py-40 relative"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100/50 px-3 sm:px-4 py-2 rounded-full mb-6 sm:mb-8 shadow-[0_2px_8px_-1px_rgba(59,130,246,0.15)] border border-blue-100"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 shadow-sm" />
            <span className="text-[9px] sm:text-[10px] text-blue-900 tracking-[0.2em] uppercase font-medium">AI Instructor & Founder</span>
          </motion.div>
          
          <div className="max-w-3xl space-y-4 sm:space-y-6">
            {['Building AI tools', 'for the next', 'generation'].map((text, index) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.2 }}
                className="relative"
              >
                <span className="block text-3xl sm:text-5xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1]">{text}</span>
              </motion.div>
            ))}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl"
            >
              18-year-old founder and engineering student. Building PromptEasy to revolutionize AI dataset creation, 
              while sharing my journey in tech and entrepreneurship.
            </motion.p>
          </div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute top-20 right-0 w-[45%] hidden lg:block"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-white">
              <img 
                src="/hero.png" 
                alt="Marius working on AI" 
                className="w-full h-full object-cover mix-blend-multiply"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent mix-blend-overlay" />
              
            </div>
          </motion.div>
        </motion.section>

        {/* Achievements Grid */}
        <motion.section 
          id="achievements"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 py-12 sm:py-16 scroll-mt-24"
        >
          {[
            { title: '50K+', subtitle: 'Students taught on Udemy', color: 'from-blue-600 to-blue-500', shadowColor: 'shadow-blue-200' },
            { title: 'OECD', subtitle: 'Member within FG-3 E2040', color: 'from-indigo-600 to-indigo-500', shadowColor: 'shadow-indigo-200' },
            { title: 'notclass', subtitle: 'EdTech Startup', color: 'from-sky-600 to-sky-500', shadowColor: 'shadow-sky-200' }
          ].map((achievement, index) => (
            <motion.div 
              key={achievement.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 0.98 }}
              className={`group relative p-8 rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 ${achievement.shadowColor} border border-gray-100`}
            >
              <div className="absolute -top-3 right-4 text-sm font-medium text-gray-400/80">0{index + 1}</div>
              <h3 className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${achievement.color}`}>
                {achievement.title}
              </h3>
              <p className="mt-2 text-gray-600">{achievement.subtitle}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* AI Consultancy Section */}
        <motion.section 
          id="consultancy"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="py-16 sm:py-24 border-t border-gray-100 scroll-mt-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-2">
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="block text-sm text-blue-600 font-medium"
                >
                  AI Consultancy
                </motion.span>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight"
                >
                  Transforming Businesses
                  <span className="block text-blue-600">Through AI Innovation</span>
                </motion.h2>
              </div>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg sm:text-xl text-gray-600 leading-relaxed"
              >
                Helping companies leverage AI to solve complex problems and drive growth. From strategy to implementation, 
                I provide end-to-end AI consulting services.
              </motion.p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { title: 'AI Strategy', description: 'Roadmap development and implementation planning' },
                  { title: 'LLM Integration', description: 'Custom LLM solutions for your business needs' },
                  { title: 'Data Analysis', description: 'AI-powered insights from your data' },
                  { title: 'Process Automation', description: 'Streamline operations with AI' }
                ].map((service, index) => (
                  <motion.div
                    key={service.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="space-y-2"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                    <p className="text-gray-600 text-sm">{service.description}</p>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Schedule a Consultation
              </motion.button>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                <img 
                  src="/consulting.png" 
                  alt="AI Consulting Session" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent mix-blend-overlay" />
              </div>
              <div className="absolute -bottom-6 -left-6">
                <div className="bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">100+ Projects</p>
                      <p className="text-xs text-gray-600">Successfully Delivered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Udemy Section */}
        <motion.section 
          id="udemy"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="py-16 sm:py-24 border-t border-gray-100 scroll-mt-24"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-50 via-transparent to-transparent opacity-70" />
            <div className="relative flex flex-col md:flex-row items-center gap-8 sm:gap-16">
              <div className="flex-1 space-y-8">
                <div className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-50 to-orange-100/50 px-4 py-2 rounded-full shadow-[0_2px_8px_-1px_rgba(234,88,12,0.15)] border border-orange-100"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 shadow-sm" />
                    <span className="text-[10px] text-orange-900 tracking-[0.2em] uppercase font-medium">Top-Rated Instructor</span>
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl font-bold text-gray-900 leading-tight"
                  >
                    Teaching the World
                    <span className="block text-orange-600">AI & Technology</span>
                  </motion.h2>
                </div>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-gray-600 leading-relaxed"
                >
                  Empowering 50,000+ students worldwide with practical skills in AI, programming, and technology through comprehensive online courses.
                </motion.p>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { number: '4.8', label: 'Average Rating', icon: '⭐️' },
                    { number: '10+', label: 'Courses Created', icon: '📚' },
                    { number: '180+', label: 'Video Lessons', icon: '🎥' },
                    { number: '40+', label: 'Countries Reached', icon: '🌍' }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl">{stat.icon}</span>
                        <div>
                          <p className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{stat.number}</p>
                          <p className="text-sm text-gray-600">{stat.label}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-4">
                  <motion.a 
                    href="https://www.udemy.com/user/marius-manolachi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-all duration-300 shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-200/50"
                  >
                    <span className="flex items-center">
                      View Courses
                      <ArrowUpRightIcon className="ml-2 w-5 h-5 inline-block" />
                    </span>
                  </motion.a>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-orange-50 text-orange-900 rounded-xl font-medium hover:bg-orange-100 transition-all duration-300 border border-orange-100"
                  >
                    Course Catalog
                  </motion.button>
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-x-4 -top-4 h-72 bg-gradient-to-b from-orange-100 to-white rounded-[2rem] -z-10" />
                  <div className="aspect-video rounded-2xl overflow-hidden relative shadow-2xl">
                    <img 
                      src="/udemy2.png" 
                      alt="Udemy Courses Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-transparent mix-blend-overlay" />
                  </div>
                  <div className="absolute -bottom-6 -right-6">
                    <div className="bg-white rounded-xl p-4 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">50K+ Students</p>
                          <p className="text-xs text-gray-600">Learning AI & Tech</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-12 bg-gradient-to-b from-orange-50 to-white p-6 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-xl">⭐️</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Student Review</h4>
                      <p className="text-sm text-gray-600">Latest Feedback</p>
                    </div>
                  </div>
                  <blockquote className="text-gray-600 italic">
                    &ldquo;Marius is an exceptional instructor. His explanations are clear, and the practical examples are invaluable.&rdquo;
                  </blockquote>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-orange-400">⭐️</span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">2 days ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* AI Speaking & Workshops Section */}
        <motion.section 
          id="speaking"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="py-16 sm:py-24 border-t border-gray-100 scroll-mt-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                <img 
                  src="/speaking.JPG" 
                  alt="Speaking at AI Conference" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-transparent mix-blend-overlay" />
              </div>
              <div className="absolute -bottom-6 -right-6">
                <div className="bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">50+ Talks</p>
                      <p className="text-xs text-gray-600">Global Audience</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <div className="space-y-2">
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="block text-sm text-indigo-600 font-medium"
                >
                  Speaking & Workshops
                </motion.span>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-4xl font-bold text-gray-900 leading-tight"
                >
                  Sharing Knowledge
                  <span className="block text-indigo-600">& Inspiring Innovation</span>
                </motion.h2>
              </div>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-xl text-gray-600 leading-relaxed"
              >
                Engaging audiences worldwide with insights on AI development, prompt engineering, and the future of technology.
              </motion.p>
              <div className="space-y-4">
                {[
                  'The Future of AI Development',
                  'Prompt Engineering Mastery',
                  'Building in Public'
                ].map((topic, index) => (
                  <motion.div
                    key={topic}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                    <span className="text-gray-600">{topic}</span>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                Book for Speaking
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* YouTube Section */}
        <motion.section 
          id="youtube"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="py-16 sm:py-24 border-t border-gray-100 scroll-mt-24"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-50 via-transparent to-transparent opacity-70" />
            <div className="relative flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 order-2 md:order-2">
                <div className="relative">
                  <div className="absolute inset-x-4 -top-4 h-72 bg-gradient-to-b from-red-100 to-white rounded-[2rem] -z-10" />
                  <div className="aspect-video rounded-2xl overflow-hidden relative shadow-2xl">
                    <img 
                      src="/youtube.png" 
                      alt="YouTube Channel Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent mix-blend-overlay" />
                  </div>
                  <div className="absolute -bottom-6 -left-6">
                    <div className="bg-white rounded-xl p-4 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">100+ Subscribers</p>
                          <p className="text-xs text-gray-600">Growing Community</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 order-1 md:order-1 space-y-8">
                <div className="space-y-2">
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="block text-sm text-red-600 font-medium"
                  >
                    YouTube
                  </motion.span>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl font-bold text-gray-900 leading-tight"
                  >
                    Learn & Grow
                    <span className="block text-red-600">Together</span>
                  </motion.h2>
                </div>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-gray-600 leading-relaxed"
                >
                  Join 100+ students learning about tech, AI, and entrepreneurship through practical tutorials and behind-the-scenes content.
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-4"
                >
            <motion.a 
              href="https://www.youtube.com/@mariusmanolachi"
              target="_blank"
              rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    <span className="flex items-center">
                      Subscribe
                      <ArrowUpRightIcon className="ml-2 w-5 h-5 inline-block" />
                    </span>
            </motion.a>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-gray-100 text-gray-900 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Latest Videos
                  </motion.button>
                </motion.div>
            </div>
            </div>
          </div>
        </motion.section>

        {/* Contact */}
        <motion.section 
          id="contact"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="py-20 sm:py-32 text-center border-t border-gray-100 relative overflow-hidden scroll-mt-24"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent opacity-70" />
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="block text-sm text-blue-600 font-medium"
              >
                Get in Touch
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight"
              >
                Let&apos;s Create Something
                <span className="block text-blue-600">Extraordinary</span>
              </motion.h2>
            </div>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Whether you&apos;re interested in AI consulting, speaking engagements, or collaboration opportunities,
              I&apos;d love to chat about how we can work together.
            </motion.p>
            <motion.a 
              href="mailto:contact@mariusmanolachi.com"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <span className="flex items-center">
                Let&apos;s talk
            <ArrowUpRightIcon className="ml-2 w-5 h-5" />
              </span>
            </motion.a>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
