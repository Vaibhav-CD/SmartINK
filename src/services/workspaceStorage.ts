import type { WorkspaceState, WorkspaceFolder, CanvasPage } from '../types';

const STORAGE_KEY = 'SmartInk_workspace_v3';

export function createDefaultWorkspace(): WorkspaceState {
  const defaultFolder1: WorkspaceFolder = {
    id: 'folder-math',
    name: 'Pure Mathematics',
    parentId: null,
    isOpen: true,
    createdAt: Date.now() - 300000,
  };

  const defaultFolder2: WorkspaceFolder = {
    id: 'folder-physics',
    name: 'Theoretical Physics',
    parentId: null,
    isOpen: true,
    createdAt: Date.now() - 200000,
  };

  // Initial Clean Canvas (Starts Completely Blank with Meta Muse Ambient State!)
  const initialBlankPage: CanvasPage = {
    id: 'page-blank-initial',
    name: 'Untitled Research Canvas',
    folderId: null,
    theorems: [],
    proofs: [],
    documents: [],
    images: [],
    socraticHints: [],
    strokes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Reference preset page 1: Pythagorean Theorem
  const page1: CanvasPage = {
    id: 'page-pythagorean',
    name: 'Pythagorean & Spatial Geometry',
    folderId: defaultFolder1.id,
    theorems: [
      {
        id: 'thm-pythagorean',
        type: 'theorem',
        title: "Pythagorean Theorem",
        statement: "In a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides.",
        latex: "a^2 + b^2 = c^2",
        position: { x: 420, y: 160 },
        size: { width: 340, height: 260 },
        proofs: [],
      }
    ],
    proofs: [
      {
        id: "pyth-algebraic",
        theoremId: "thm-pythagorean",
        methodology: "Algebraic",
        title: "Algebraic Area Expansion",
        summary: "Construct a large square of side (a + b) enclosing four congruent right triangles and an inner square of side c.",
        steps: [
          {
            stepNumber: 1,
            title: "Total Area of Outer Square",
            latex: "\\text{Area}_{\\text{outer}} = (a + b)^2 = a^2 + 2ab + b^2",
            explanation: "Expand the square with side length (a + b).",
            socraticHint: "What happens when you express the area of the outer square as the sum of its 5 interior sub-shapes?"
          },
          {
            stepNumber: 2,
            title: "Sum of Subdivided Components",
            latex: "\\text{Area}_{\\text{outer}} = 4 \\times \\left(\\frac{1}{2}ab\\right) + c^2 = 2ab + c^2",
            explanation: "The outer square contains four identical right triangles (area 1/2*a*b each) and one inner square of side c.",
            socraticHint: "Notice both Step 1 and Step 2 describe the exact same total area. What can you equate?"
          },
          {
            stepNumber: 3,
            title: "Equate and Simplify",
            latex: "a^2 + 2ab + b^2 = 2ab + c^2 \\implies a^2 + b^2 = c^2",
            explanation: "Subtract 2ab from both sides to arrive at the theorem.",
            socraticHint: "Why must the inner quadrilateral be a true square and not just a rhombus?"
          }
        ],
        position: { x: 860, y: 80 }
      },
      {
        id: "pyth-geometric",
        theoremId: "thm-pythagorean",
        methodology: "Geometric",
        title: "Euclid's Windmill (Book I, Prop 47)",
        summary: "Shows that the square on the hypotenuse can be split into two rectangles, each having the same area as the squares on the respective legs.",
        steps: [
          {
            stepNumber: 1,
            title: "Altitude onto Hypotenuse",
            latex: "\\text{Drop perpendicular from right angle to line } c",
            explanation: "Divide the square on the hypotenuse into two rectangular segments.",
            socraticHint: "How do shears (parallelogram shearing) preserve areas between parallel lines?"
          },
          {
            stepNumber: 2,
            title: "Congruence of Triangles",
            latex: "\\triangle ABF \\cong \\triangle AEC",
            explanation: "By SAS congruence, two triangles spanning between the square corners have identical area.",
            socraticHint: "Can you spot why the triangle's area is exactly half of the adjacent rectangle's area?"
          },
          {
            stepNumber: 3,
            title: "Summation of Rectangle Areas",
            latex: "\\text{Area}(c_1) + \\text{Area}(c_2) = a^2 + b^2 = c^2",
            explanation: "The two rectangles sum to the entire square on hypotenuse c.",
            socraticHint: "Why does this visual proof require no algebraic multiplication?"
          }
        ],
        position: { x: 860, y: 320 }
      },
      {
        id: "pyth-similar",
        theoremId: "thm-pythagorean",
        methodology: "Calculus",
        title: "Einstein's Similar Triangles Proof",
        summary: "An elegant scaling argument: the area of any figure scaled by length L is proportional to L².",
        steps: [
          {
            stepNumber: 1,
            title: "Altitude Division",
            latex: "\\text{Altitude splits } \\triangle ABC \\text{ into two similar triangles}",
            explanation: "The altitude divides the original triangle of hypotenuse c into two triangles with hypotenuses a and b.",
            socraticHint: "What is the relationship between the angles of all three triangles?"
          },
          {
            stepNumber: 2,
            title: "Area Proportionality",
            latex: "\\text{Area} = k \\cdot L^2 \\implies A_c = k c^2, \\; A_a = k a^2, \\; A_b = k b^2",
            explanation: "Because all three triangles are mutually similar, their areas are all scaled by the same dimensionless constant k.",
            socraticHint: "What must the sum of the two smaller sub-triangle areas equal?"
          },
          {
            stepNumber: 3,
            title: "Conservation of Area",
            latex: "k a^2 + k b^2 = k c^2 \\implies a^2 + b^2 = c^2",
            explanation: "Divide by k across the equality to eliminate the shape-dependent factor.",
            socraticHint: "Does this proof also work if you erect semicircles or pentagons on each side instead of squares?"
          }
        ],
        position: { x: 860, y: 560 }
      }
    ],
    documents: [
      {
        id: 'doc-pythagorean-history',
        type: 'paper',
        title: "On the Geometric Invariance of Right Triangles",
        authors: "Euclid of Alexandria, Elements Book I",
        abstract: "In right-angled triangles the square on the side subtending the right angle is equal to the squares on the sides containing the right angle.",
        pages: [
          "Proposition 47: In right-angled triangles the square on the side opposite the right angle equals the sum of the squares on the sides containing the right angle. Let ABC be a right-angled triangle having the angle BAC right. I say that the square on BC equals the squares on BA and AC.",
          "Construction: Describe on BC the square BDEC, and on BA, AC the squares GB, HC. Through A draw AL parallel to either BD or CE, and join AD, FC. Since angle BAC is right, and angle BAG is also right, the straight lines CA, AG lie in a straight line.",
          "Synthesis: The triangle ABD is equal to triangle FBC, because BD is equal to BC, and BA is equal to FB. Hence the rectangle BL is double of triangle ABD, and the square GB is double of triangle FBC. Therefore the rectangle BL is equal to the square GB."
        ],
        currentPage: 0,
        position: { x: 40, y: 160 },
        size: { width: 340, height: 380 },
      }
    ],
    images: [],
    socraticHints: [
      {
        id: 'hint-pyth-1',
        targetId: 'thm-pythagorean',
        position: { x: 420, y: 460 },
        question: "Why does the algebraic expansion (a+b)² naturally reveal four symmetric right triangles?",
        hint: "Visualize four rotations of the triangle around the perimeter; what shape is left untouched in the center?",
      }
    ],
    strokes: [],
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 300000,
  };

  // Reference preset page 2: Prime Infinitude
  const page2: CanvasPage = {
    id: 'page-primes',
    name: 'Infinitude of Primes & Density',
    folderId: defaultFolder1.id,
    theorems: [
      {
        id: 'thm-primes',
        type: 'theorem',
        title: "Infinitude of Primes (Euclid's Theorem)",
        statement: "There are infinitely many prime numbers.",
        latex: "\\pi(x) \\to \\infty \\quad \\text{as } x \\to \\infty",
        position: { x: 420, y: 160 },
        size: { width: 340, height: 260 },
        proofs: [],
      }
    ],
    proofs: [
      {
        id: "primes-contradiction",
        theoremId: "thm-primes",
        methodology: "Contradiction",
        title: "Euclid's Classical Contradiction",
        summary: "Assume primes are finite; construct a number that must have a prime factor not in the finite set.",
        steps: [
          {
            stepNumber: 1,
            title: "Assume Finitude",
            latex: "P = \\{p_1, p_2, \\dots, p_n\\}",
            explanation: "Assume for contradiction that P is the complete list of all primes.",
            socraticHint: "What happens if we multiply all of them together?"
          },
          {
            stepNumber: 2,
            title: "Construct N",
            latex: "N = (p_1 \\cdot p_2 \\cdots p_n) + 1",
            explanation: "Consider the integer N. N is strictly greater than 1, so it must have at least one prime divisor q.",
            socraticHint: "Can any prime in our original list P divide N without a remainder?"
          },
          {
            stepNumber: 3,
            title: "Contradiction Arises",
            latex: "N \\equiv 1 \\pmod{p_i} \\implies q \\notin P",
            explanation: "Every p_i leaves a remainder of 1 upon dividing N. Thus q is a prime not in P, contradicting our premise.",
            socraticHint: "Does N itself necessarily have to be prime?"
          }
        ],
        position: { x: 860, y: 80 }
      }
    ],
    documents: [
      {
        id: 'doc-primes-euler',
        type: 'paper',
        title: "Variae observationes circa series infinitas",
        authors: "Leonhard Euler (1737)",
        abstract: "The sum of the reciprocals of the prime numbers diverges, revealing profound asymptotic properties of the integers.",
        pages: [
          "Euler's product formula establishes an identity between the Riemann zeta function and an infinite product over all prime numbers: sum(1/n^s) = prod(1 - p^-s)^-1.",
          "Taking the limit as s approaches 1, the left-hand side reduces to the divergent harmonic series. Because a finite product of finite factors cannot diverge to infinity, the set of primes must be unbounded."
        ],
        currentPage: 0,
        position: { x: 40, y: 160 },
        size: { width: 340, height: 380 },
      }
    ],
    images: [],
    socraticHints: [],
    strokes: [],
    createdAt: Date.now() - 250000,
    updatedAt: Date.now() - 250000,
  };

  // Reference preset page 3: Euler's Identity
  const page3: CanvasPage = {
    id: 'page-euler',
    name: "Euler's Complex Analysis",
    folderId: defaultFolder2.id,
    theorems: [
      {
        id: 'thm-euler',
        type: 'theorem',
        title: "Euler's Identity",
        statement: "Connects the five fundamental mathematical constants (e, i, pi, 1, 0) in one beautiful equation.",
        latex: "e^{i\\pi} + 1 = 0",
        position: { x: 420, y: 160 },
        size: { width: 340, height: 260 },
        proofs: [],
      }
    ],
    proofs: [
      {
        id: "euler-taylor",
        theoremId: "thm-euler",
        methodology: "Algebraic",
        title: "Taylor / Maclaurin Series Expansion",
        summary: "Substitute ix into the exponential Taylor series and split into even and odd powers.",
        steps: [
          {
            stepNumber: 1,
            title: "Exponential Series",
            latex: "e^{ix} = 1 + ix + \\frac{(ix)^2}{2!} + \\frac{(ix)^3}{3!} + \\dots",
            explanation: "Expand e^(ix) using the universal power series definition for the exponential function.",
            socraticHint: "Recall that i^2 = -1, i^3 = -i, i^4 = 1. What happens when you substitute these?"
          },
          {
            stepNumber: 2,
            title: "Euler's Formula & Specialization",
            latex: "e^{ix} = \\cos x + i\\sin x \\implies e^{i\\pi} = -1 + 0i",
            explanation: "Substitute x = pi. Adding 1 to both sides yields e^(i*pi) + 1 = 0.",
            socraticHint: "What is the geometric interpretation of multiplying by e^(i*theta) in the complex plane?"
          }
        ],
        position: { x: 860, y: 120 }
      }
    ],
    documents: [],
    images: [],
    socraticHints: [],
    strokes: [],
    createdAt: Date.now() - 200000,
    updatedAt: Date.now() - 200000,
  };

  return {
    folders: [defaultFolder1, defaultFolder2],
    pages: [initialBlankPage, page1, page2, page3],
    activePageId: initialBlankPage.id, // Starts on the blank initial canvas!
  };
}

export function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        parsed.pages = parsed.pages.map((p: any) => ({ ...p, images: p.images || [] }));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load workspace from localStorage, using defaults:', err);
  }
  return createDefaultWorkspace();
}

export function saveWorkspace(state: WorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save workspace to localStorage:', err);
  }
}

