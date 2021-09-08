import React from "react";
import { Link, graphql } from "gatsby";
import Layout from "../components/layout";

import SEO from "../components/seo";

const BooksPage = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title;

  const booksByYear = groupedByYear(books);
  const years = Object.keys(booksByYear).sort().reverse();

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="" />

      <h1 className="text-2xl mb-4">Reading List</h1>

      {years.map((year) => {
        return <div className="mb-8">
          <div className="bold mb-2 text-xl">{year}</div>
          {booksByYear[year].map((book) => {
            return <ul className="list-disc">
              <BookItem book={book} />
            </ul>
          })}
        </div>
      })}

    </Layout>
  )
}

const BookItem = ({ book }) => {
  return <li className="ml-8">
    <div>{book.title}</div>
  </li>
}

const groupedByYear = (books) => {
  return books.reduce((acc, book) => {
    let year
    if (book.date_finished === "") {
      year = "Currently Reading"
    } else {
      year = book.date_finished.substring(0, 4);
    }
    acc[year] = acc[year] || [];
    acc[year].push(book);
    return acc;
  }, {});
};

let books = [
  {
    author: "Laszlo Bock",
    date_finished: "2021/06/01",
    title: "Work Rules!: Insights from Inside Google That Will Transform How You Live and Lead"
  },
  {
    author: "David Marquet ",
    date_finished: "",
    title: "Turn the Ship Around!: A True Story of Turning Followers into Leaders"
  },
  {
    author: "",
    date_finished: "2021/06/01",
    title: "Staff Engineer: Leadership beyond the management track"
  },
  {
    author: "",
    date_finished: "2021/06/01",
    title: "The Checklist Manifesto: How to Get Things Right"
  },
  {
    author: "",
    date_finished: "2021/06/01",
    title: "Good Strategy Bad Strategy: The Difference and Why It Matters"
  },
  {
    author: "",
    date_finished: "2021/06/01",
    title: "Thinking in Systems: A Primer"
  },
  {
    author: "",
    date_finished: "2021/06/01",
    title: "No Rules Rules: Netflix and the Culture of Reinvention"
  },
  {
    author: "Christina Wodtke",
    date_finished: "2021/06/01",
    title: "Radical Focus: Achieving Your Most Important Goals with Objectives and Key Results"
  },
  {
    author: "Christina Wodtke",
    date_finished: "2021/06/01",
    title: "Trillion Dollar Coach: The Leadership Playbook of Silicon Valley's Bill Campbell"
  },
  {
    author: "Mat Buckland",
    date_finished: "2021/06/01",
    title: "Programming Game AI by Example"
  },
  {
    author: "Will Larson",
    date_finished: "2021/06/01",
    title: "An Elegant Puzzle: Systems of Engineering Management"
  },
  //
  // 2020
  //
  {
    author: "",
    date_finished: "2020/06/01",
    title: "Site Reliability Engineering: How Google Runs Production Systems"
  },
  {
    author: "",
    date_finished: "2020/06/01",
    title: "Powerful: Building a Culture of Freedom and Responsibility"
  },
  {
    author: "",
    date_finished: "2020/06/01",
    title: "The Culture Code: The Secrets of Highly Successful Groups"
  },
  {
    author: "",
    date_finished: "2020/06/01",
    title: "The Unicorn Project"
  },
  {
    author: "",
    date_finished: "2020/06/01",
    title: "Team Topologies: Organizing Business and Technology Teams for Fast Flow"
  },
  {
    author: "John Doerr",
    date_finished: "2020/06/01",
    title: "Measure What Matters"
  },
  {
    author: "Patrick Lencioni",
    date_finished: "2020/06/01",
    title: "The Five Dysfunctions of a Team: A Leadership Fable"
  },
  //
  // 2019
  //
  {
    author: "",
    date_finished: "2019/06/01",
    title: "The Manager's Path: A Guide for Tech Leaders Navigating Growth and Change"
  },
  {
    author: "",
    date_finished: "2019/06/01",
    title: "Designing Data-Intensive Applications"
  },
  {
    author: "",
    date_finished: "2019/06/01",
    title: "The Phoenix Project: A Novel About IT, DevOps, and Helping Your Business Win"
  },
  {
    author: "",
    date_finished: "2019/06/01",
    title: "Accelerate: Building and Scaling High-Performing Technology Organizations"
  },
  {
    author: "",
    date_finished: "2019/06/01",
    title: "Implementing Domain-Driven Design"
  },
  {
    author: "",
    date_finished: "2019/06/01",
    title: "The Coaching Habit: Say Less, Ask More & Change the Way You Lead Forever"
  },
  {
    author: "",
    date_finished: "2019/06/01",
    title: "Thinking, Fast and Slow"
  },
  //
  // 2018
  //
  {
    author: "",
    date_finished: "2018/06/01",
    title: "Delivering Happiness: A Path to Profits, Passion, and Purpose"
  },
  {
    author: "",
    date_finished: "2018/06/01",
    title: "The Toyota Way: 14 Management Principles from the World's Greatest Manufacturer"
  },
  {
    author: "",
    date_finished: "2018/06/01",
    title: "Seven Languages in Seven Weeks"
  },
  {
    author: "",
    date_finished: "2018/06/01",
    title: "Design Patterns: Elements of Reusable Object-Oriented Software"
  },
  {
    author: "",
    date_finished: "2018/06/01",
    title: "Domain-Driven Design: Tackling Complexity in the Heart of Software"
  },
  {
    author: "Kim Malone Scott",
    date_finished: "2018/06/01",
    title: "Radical Candor: Be a Kickass Boss Without Losing Your Humanity"
  },
  {
    author: "Kent Beck, Cynthia Andres",
    date_finished: "2018/06/01",
    title: "Extreme Programming Explained: Embrace Change"
  },
  //
  // 2017
  //
  {
    author: "",
    date_finished: "2017/06/01",
    title: "Seven Databases in Seven Weeks: A Guide to Modern Databases and the NoSQL Movement"
  },
  {
    author: "Tom DeMarco, Timothy R. Lister",
    date_finished: "2017/06/01",
    title: "Peopleware: Productive Projects and Teams"
  },
  {
    author: "Andy Hunt, Dave Thomas",
    date_finished: "2017/06/01",
    title: "The Pragmatic Programmer"
  },
  {
    author: "Robert C. Martin",
    date_finished: "2017/06/01",
    title: "Clean Code: A Handbook of Agile Software Craftsmanship"
  },
  {
    author: "Martin Fowler, David Rice, Matthew Foemmel, Edward Hieatt, Robert Mee, Randy Stafford",
    date_finished: "2017/06/01",
    title: "Patterns of Enterprise Application Architecture"
  },
  {
    author: "Robert C. Martin",
    date_finished: "2017/06/01",
    title: "Clean Architecture"
  },
  //
  // 2016
  //
  {
    author: "Martin Fowler, Kent Beck, Don Roberts",
    date_finished: "2016/06/01",
    title: "Refactoring: Improving the Design of Existing Code"
  },
  {
    author: "Steve McConnell",
    date_finished: "2016/06/01",
    title: "Code Complete"
  },
  {
    author: "Sandi Metz",
    date_finished: "2016/06/01",
    title: "Practical Object Oriented Design in Ruby"
  },
  //
  // 2015
  //
  {
    author: "Michael Hartl",
    date_finished: "2015/06/01",
    title: "Ruby on Rails Tutorial"
  },
]



export default BooksPage;

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
