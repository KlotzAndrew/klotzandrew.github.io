import React from "react";
import { Link, graphql } from "gatsby";
import Layout from "../components/layout";

import Image from "gatsby-image";
import SEO from "../components/seo";

const ProjectsIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title;

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="" />

      {/* <h1 className="text-xl">Projects</h1> */}

      {projects(data).map((project) => {
        return <div className="flex my-10">
          <div>
            <Image
              className="border"
              fluid={project.imageSrc}
              alt={"project landing page"}
              style={{
                maxWidth: 200,
                minWidth: 200,
                // borderRadius: `100%`,
              }}
              imgStyle={{
                // borderRadius: `50%`,
              }}
            />
          </div>

          <div className="flex flex-col ml-4">
            <div className="flex">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline mb-2 text-blue-600 hover:text-blue-800 visited:text-purple-600">{project.name}</a>

              <div className="px-1">
                {project.defunct && <div className="px-2 text-xs bg-red-500 rounded-full">defunct</div>}
              </div>
            </div>

            <div className="flex-grow">{project.desc}</div>

            <div className="flex">
              {project.tech && <div>tech: </div>}
              {project.tech && project.tech.map((name) => {
                return <div className="mx-1 px-1 rounded-full bg-gray-400">{name}</div>
              })}
            </div>
          </div>
        </div>
      })}
    </Layout>
  )
}

let projects = (data) => [
  {
    name: "TestRecall",
    url: "https://testrecall.com",
    desc: "Increasing test reliability can be hard. TestRecall provides analytics for your tests.",
    imageSrc: data.projectTR.childImageSharp.fluid,
    defunct: false
  },
  {
    name: "StashTabViewer",
    url: "https://stashtabviewer.com",
    desc: "Path of Exile provides no way to view character items outside the game. StashTabViewer ingests ~1 TB of events per month from Path of Exile, displaying the information online.",
    imageSrc: data.projectSTV.childImageSharp.fluid,
    tech: ["go", "react", "terraform", "DigitalOcean", "badgerdb", "autohotkey"],
    defunct: false
  },
  {
    name: "CloudLeaderBoard",
    url: "https://cloudleaderboard.com",
    desc: "Build real time leaderboards in the cloud, with a an easy to use API.",
    imageSrc: data.projectCLB.childImageSharp.fluid,
    tech: ["go", "react", "aws", "pulumi", "postgres", "redis"],
    defunct: true
  },
  {
    name: "HeroQueue",
    url: "http://heroqueue.com",
    desc: "HeroQueue is a registration portal for eSports tournaments, including ELO-based match balancing.",
    imageSrc: data.projectHQ.childImageSharp.fluid,
    tech: ["rails", "heroku", "postgres"],
    defunct: true
  },
  {
    name: "IllBePro",
    url: "http://illbepro.com",
    desc: "What if you could win pizza for playing video games? IllBePro connects in-game achievements to physical rewards, letting you win pizza for winning games.",
    imageSrc: data.projectIBP.childImageSharp.fluid,
    tech: ["rails", "heroku", "postgres"],
    defunct: true
  }
]

export default ProjectsIndex;

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

    projectTR: file(absolutePath: { regex: "/tr-main.png/" }) {
      childImageSharp {
        fluid(quality: 100) {
          ...GatsbyImageSharpFluid
        }
      }
    }
    projectSTV: file(absolutePath: { regex: "/stv-main.png/" }) {
      childImageSharp {
        fluid(quality: 100) {
          ...GatsbyImageSharpFluid
        }
      }
    }
    projectCLB: file(absolutePath: { regex: "/clb-main.png/" }) {
      childImageSharp {
        fluid(quality: 100) {
          ...GatsbyImageSharpFluid
        }
      }
    }
    projectHQ: file(absolutePath: { regex: "/hq-main2.png/" }) {
      childImageSharp {
        fluid(quality: 100) {
          ...GatsbyImageSharpFluid
        }
      }
    }
    projectIBP: file(absolutePath: { regex: "/ibp-main2.png/" }) {
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
`;
