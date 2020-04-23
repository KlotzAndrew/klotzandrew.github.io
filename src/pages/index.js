import React from "react"
import { Link, graphql } from "gatsby"
import Image from "gatsby-image"

import Bio from "../components/bio"
import Layout from "../components/layout"
import SEO from "../components/seo"

const BlogIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title
  const { author, social } = data.site.siteMetadata

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="" />

      <div className="mt-20 text-center">
        <Image
          className="my-8 m-auto"
          fluid={data.avatar.childImageSharp.fluid}
          alt={author.name}
          style={{
            maxWidth: 200,
            minWidth: 50,
            borderRadius: `100%`,
          }}
          imgStyle={{
            borderRadius: `50%`,
          }}
        />
        <div className="text-center">
          <p className="italic mb-4">Ensure people have the tools to be their best</p>

          <p>Andrew Klotz is a an Entrepreneur and Software Engineer with a Masters Degree in business. He brings his technical and business experience to deliver high-impact projects.</p>
        </div>
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

        author {
          name
          summary
        }
        social {
          twitter
        }
      }
    }
    avatar: file(absolutePath: { regex: "/andrew-2019-03-24_300x300_min.jpg/" }) {
      childImageSharp {
        fluid(quality: 100) {
          ...GatsbyImageSharpFluid
        }
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
          }
        }
      }
    }
  }
`
