import { createToken, Lexer, CstParser, IToken } from "chevrotain";

// ----------------- Lexer -----------------
const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t\n\r]+/,
  group: Lexer.SKIPPED,
});

const Comment = createToken({
  name: "Comment",
  pattern: /\/\/[^\n\r]*|\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED,
});

const EntityKw = createToken({ name: "EntityKw", pattern: /entity|table/i });
const RelationKw = createToken({ name: "RelationKw", pattern: /relation/i });
const PkKw = createToken({ name: "PkKw", pattern: /pk/i });
const FkKw = createToken({ name: "FkKw", pattern: /fk/i });
const UkKw = createToken({ name: "UkKw", pattern: /uk/i });
const NullKw = createToken({ name: "NullKw", pattern: /null/i });
const NotNullKw = createToken({ name: "NotNullKw", pattern: /not\s+null/i });

const Arrow = createToken({ name: "Arrow", pattern: /->/ });
const Colon = createToken({ name: "Colon", pattern: /:/ });
const LCurly = createToken({ name: "LCurly", pattern: /\{/ });
const RCurly = createToken({ name: "RCurly", pattern: /\}/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const Dot = createToken({ name: "Dot", pattern: /\./ });
const Star = createToken({ name: "Star", pattern: /\*/ });

const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"(?:[^"\\]|\\.)*"/,
});

const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

const NumberLiteral = createToken({
  name: "NumberLiteral",
  pattern: /[0-9]+/,
});

const allTokens = [
  WhiteSpace,
  Comment,
  EntityKw,
  RelationKw,
  PkKw,
  FkKw,
  UkKw,
  NotNullKw,
  NullKw,
  Arrow,
  Colon,
  LCurly,
  RCurly,
  LParen,
  RParen,
  Dot,
  Star,
  StringLiteral,
  Identifier,
  NumberLiteral,
];

export const ERDLexer = new Lexer(allTokens);

// ----------------- Parser -----------------
class ERDParser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  public diagram = this.RULE("diagram", () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.entity) },
        { ALT: () => this.SUBRULE(this.relation) },
      ]);
    });
  });

  public entity = this.RULE("entity", () => {
    this.CONSUME(EntityKw);
    this.CONSUME(Identifier, { LABEL: "entityName" });
    this.CONSUME(LCurly);
    this.MANY(() => {
      this.SUBRULE(this.attribute);
    });
    this.CONSUME(RCurly);
  });

  public attribute = this.RULE("attribute", () => {
    this.CONSUME(Identifier, { LABEL: "attrName" });
    this.CONSUME2(Identifier, { LABEL: "attrType" });
    this.OPTION(() => {
      this.CONSUME(LParen);
      this.CONSUME(NumberLiteral, { LABEL: "typeLen" });
      this.CONSUME(RParen);
    });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(PkKw, { LABEL: "modifier" }) },
        { ALT: () => this.CONSUME(UkKw, { LABEL: "modifier" }) },
        { ALT: () => this.CONSUME(NotNullKw, { LABEL: "modifier" }) },
        { ALT: () => this.CONSUME(NullKw, { LABEL: "modifier" }) },
        { ALT: () => this.SUBRULE(this.fkModifier) },
      ]);
    });
  });

  public fkModifier = this.RULE("fkModifier", () => {
    this.CONSUME(FkKw);
    this.OPTION(() => {
      this.CONSUME(Arrow);
      this.CONSUME(Identifier, { LABEL: "targetEntity" });
      this.CONSUME(Dot);
      this.CONSUME2(Identifier, { LABEL: "targetAttr" });
    });
  });

  public relation = this.RULE("relation", () => {
    this.CONSUME(RelationKw);
    this.SUBRULE(this.fieldRef, { LABEL: "source" });
    this.SUBRULE(this.cardinality, { LABEL: "sourceCard" });
    this.CONSUME(Arrow);
    this.SUBRULE2(this.cardinality, { LABEL: "targetCard" });
    this.SUBRULE2(this.fieldRef, { LABEL: "target" });
    this.OPTION(() => {
      this.CONSUME(Colon);
      this.CONSUME(StringLiteral, { LABEL: "label" });
    });
  });

  public fieldRef = this.RULE("fieldRef", () => {
    this.CONSUME(Identifier, { LABEL: "entity" });
    this.CONSUME(Dot);
    this.CONSUME2(Identifier, { LABEL: "field" });
  });

  public cardinality = this.RULE("cardinality", () => {
    this.OR([
      { ALT: () => this.CONSUME(NumberLiteral, { LABEL: "value" }) },
      { ALT: () => this.CONSUME(Star, { LABEL: "value" }) },
      { ALT: () => this.CONSUME(Identifier, { LABEL: "value" }) }, // For 'n' or 'N'
    ]);
  });
}

export const parser = new ERDParser();

// ----------------- AST Types -----------------
export interface ASTAttribute {
  name: string;
  type: string;
  isPk: boolean;
  isUk: boolean;
  isFk: boolean;
  fkTarget?: { entity: string; field: string };
  isNull?: boolean;
}

export interface ASTEntity {
  name: string;
  attributes: ASTAttribute[];
}

export interface ASTRelation {
  source: { entity: string; field: string };
  sourceCard: string;
  target: { entity: string; field: string };
  targetCard: string;
  label?: string;
}

export interface ASTDiagram {
  entities: ASTEntity[];
  relations: ASTRelation[];
}

// ----------------- Visitor -----------------
const BaseVisitor = parser.getBaseCstVisitorConstructor();

class ERDVisitor extends BaseVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  diagram(ctx: any): ASTDiagram {
    const entities: ASTEntity[] = [];
    const relations: ASTRelation[] = [];

    if (ctx.entity) {
      ctx.entity.forEach((e: any) => entities.push(this.visit(e)));
    }
    if (ctx.relation) {
      ctx.relation.forEach((r: any) => relations.push(this.visit(r)));
    }

    return { entities, relations };
  }

  entity(ctx: any): ASTEntity {
    const name = ctx.entityName[0].image;
    const attributes = ctx.attribute ? ctx.attribute.map((a: any) => this.visit(a)) : [];
    return { name, attributes };
  }

  attribute(ctx: any): ASTAttribute {
    const name = ctx.attrName[0].image;
    let type = ctx.attrType[0].image;
    
    if (ctx.typeLen) {
      type += `(${ctx.typeLen[0].image})`;
    }

    let isPk = false;
    let isUk = false;
    let isFk = false;
    let isNull = undefined;
    let fkTarget = undefined;

    if (ctx.modifier) {
      ctx.modifier.forEach((m: IToken) => {
        if (m.tokenType.name === "PkKw") isPk = true;
        if (m.tokenType.name === "UkKw") isUk = true;
        if (m.tokenType.name === "NullKw") isNull = true;
        if (m.tokenType.name === "NotNullKw") isNull = false;
      });
    }

    if (ctx.fkModifier) {
      ctx.fkModifier.forEach((fk: any) => {
        const fkData = this.visit(fk);
        if (fkData) {
          isFk = true;
          if (fkData.entity) {
            fkTarget = fkData;
          }
        }
      });
    }

    return { name, type, isPk, isUk, isFk, fkTarget, isNull };
  }

  fkModifier(ctx: any) {
    if (ctx.targetEntity && ctx.targetAttr) {
      return {
        entity: ctx.targetEntity[0].image,
        field: ctx.targetAttr[0].image,
      };
    }
    return { isFk: true };
  }

  relation(ctx: any): ASTRelation {
    const source = this.visit(ctx.source[0]);
    const sourceCard = this.visit(ctx.sourceCard[0]);
    const target = this.visit(ctx.target[0]);
    const targetCard = this.visit(ctx.targetCard[0]);
    let label = undefined;

    if (ctx.label) {
      label = ctx.label[0].image.slice(1, -1); // Remove quotes
    }

    return { source, sourceCard, target, targetCard, label };
  }

  fieldRef(ctx: any) {
    return {
      entity: ctx.entity[0].image,
      field: ctx.field[0].image,
    };
  }

  cardinality(ctx: any) {
    if (ctx.value) {
      return ctx.value[0].image;
    }
    return "1";
  }
}

const visitor = new ERDVisitor();

export function parseDSL(text: string) {
  const lexResult = ERDLexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.diagram();

  if (parser.errors.length > 0) {
    return { ast: null, errors: parser.errors };
  }

  const ast = visitor.visit(cst) as ASTDiagram;
  return { ast, errors: [] };
}
