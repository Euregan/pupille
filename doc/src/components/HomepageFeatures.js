import React from 'react'
import clsx from 'clsx'
import styles from './HomepageFeatures.module.css'

const features = [
  {
    title: 'Easy to Use',
    Svg: require('../../static/img/undraw_setup.svg').default,
    description: (
      <>
        Pupille was designed to be easy to install and configure to start
        testing your site as quickly as possible. No need to modify your
        website.
      </>
    )
  },
  {
    title: 'Peace of mind',
    Svg: require('../../static/img/undraw_relax.svg').default,
    description: (
      <>
        Pupille has your back. Setup your tests and let Pupille warn you of any
        unforeseen change before it reaches production.
      </>
    )
  }
]

const Feature = ({ Svg, title, description }) => (
  <div className={clsx('col col--4')}>
    <div className="text--center">
      <Svg className={styles.featureSvg} alt={title} />
    </div>
    <div className="text--center padding-horiz--md">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  </div>
)

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.row}>
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
