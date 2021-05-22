module Test exposing (..)

import Config exposing (Config)
import Html exposing (Html, button, div, h3, img, text)
import Html.Attributes exposing (class, src)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Decoder, field, list, string)


type Status
    = Running
    | Failure
    | Success
    | New


type alias Test =
    { url : String
    , status : Status
    , slug : String
    }


decoder : Decoder Test
decoder =
    let
        statusDecoder : String -> Decoder Status
        statusDecoder raw =
            case raw of
                "running" ->
                    Decode.succeed Running

                "failure" ->
                    Decode.succeed Failure

                "success" ->
                    Decode.succeed Success

                "new" ->
                    Decode.succeed New

                anythingElse ->
                    Decode.fail <| anythingElse ++ " is not a valid status"
    in
    Decode.map3 Test
        (field "url" string)
        (field "status" string |> Decode.andThen statusDecoder)
        (field "slug" string)


view : Config -> Test -> Html msg
view config test =
    let
        content =
            case test.status of
                Running ->
                    text ""

                Failure ->
                    text ""

                Success ->
                    text ""

                New ->
                    text ""
    in
    div []
        [ h3 [] [ text test.url ]
        , div [ class "image-comparison" ]
            [ img [ src <| "file://" ++ config.root ++ "/vision/original/" ++ test.slug ++ ".png" ] []
            , img [ src <| "file://" ++ config.root ++ "/vision/results/" ++ test.slug ++ ".png" ] []
            , img [ src <| "file://" ++ config.root ++ "/vision/new/" ++ test.slug ++ ".png" ] []
            ]
        ]
