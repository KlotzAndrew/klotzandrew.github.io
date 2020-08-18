import React from "react"
import { Link, graphql } from "gatsby"
import Img from "gatsby-image"

import Bio from "../components/bio"
import Layout from "../components/layout"
import SEO from "../components/seo"

const BlogIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title
  const posts = data.allMarkdownRemark.edges

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="Blog" />
      <div className="flex flex-wrap">
        {posts.map(({ node }) => {
          const title = node.frontmatter.title || node.fields.slug
          const img = node.frontmatter.featured && node.frontmatter.featured.childImageSharp.fluid
          if (!node.frontmatter.title) return <div></div>

          return (
            <article className="mx-2 mb-12 w-64" key={node.fields.slug}>
              <header>
                <div className="h-48 mb-2">
                  {img && <Img imgStyle={{ objectFit: 'contain' }} className="h-full" fluid={node.frontmatter.featured.childImageSharp.fluid} />}
                </div>
                <h3>
                  <Link className="text-xl font-bold text-blue-500" to={node.fields.slug}>
                    {title}
                  </Link>
                </h3>
                <small>{node.frontmatter.date}</small>
              </header>
              <section>
                <p className=""
                  dangerouslySetInnerHTML={{
                    __html: node.frontmatter.description || node.excerpt,
                  }}
                />
              </section>
            </article>
          )
        })}
      </div>
    </Layout>
  )
}

export default BlogIndex

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      edges {
        node {
          excerpt
          fields {
            slug
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            description

            featured {
              childImageSharp {
                fluid(maxWidth: 800) {
                  ...GatsbyImageSharpFluid
                }
              }
            }
          }
        }
      }
    }
  }
`
